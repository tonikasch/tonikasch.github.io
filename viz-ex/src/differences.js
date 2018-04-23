import * as d3 from 'd3';
import tip from 'd3-tip';

import $ from 'jquery';
import debounce from 'lodash/debounce';

import { OppositeViz, parseURL } from 'ske-viz';

let viz;
let tooltip;
let params;
let middlePosition;
let fontSize;

// initial query words
let queryLeft = 'research'; // other possibilities: 'win', 'house'
let queryRight = 'experiment'; // other possibilities: 'fail', 'office'

let selectedOption = 0;
const options = [
  { name: 'modifier' },
  { name: 'object_of' },
  { name: 'subject_of' },
  { name: 'and/or' }
];

function createOpposite(data, value) {
  return OppositeViz(data,
    {
      viz: {
        divId: 'viz-wrapper-diff',
        maxItems: params.maxItems,
        width: params.width,
        height: params.height,
        margin: params.margin
      },
      circle: {
        size: params.circleSize,
        mouseover: showCircleTooltip,
        mouseout: tooltip.hide
      },
      text: {
        scale: true,
        font: 'Metrophobic, Helvetica, Arial, sans-serif',
        color: 'white',
        size: params.textSize,
        mouseover: showTextTooltip,
        mouseout: tooltip.hide,
        mouseclick: wordClick
      },
      category: {
        showName: false,
        showItems: [options[value]]
      },
      legend: {
        color: 'rgb(250, 250, 250)',
        fontSize: 12
      }
    }
  );
}

function showCircleTooltip(d) {
  const selectedCircle = d3.select('#word__circle-' + d.id);

  tooltip.show(d, selectedCircle._groups[0][0]);
}

function showTextTooltip(d) {
  const selectedText = d3.select('#word__text-' + d.id);

  tooltip.show(d, selectedText._groups[0][0]);
}

function toggleNotification(show, text) {
  const notification = $('.notification');

  if (show) {
    // the text shown in notification
    let notificationText = typeof text === 'string' ? text : text.toString();

    // remove special characters, so that text is not confusing
    notificationText = notificationText.replace(/-(.)/g, '');

    notification
      .fadeIn()
      .css({
        top: middlePosition.top - 50,
        left: middlePosition.left - 150
      })
      .text(notificationText);

    notification
      .delay(3000)
      .fadeOut();

    toggleInput(false, true, false);

  } else {
    notification
      .fadeOut();
  }
}

function updateButtons() {
  $('#button-check').css({
    'top': middlePosition ? middlePosition.top - 40 : 0,
    'left': middlePosition ? middlePosition.left - 15 : 0
  });

  // add listener (jQuery will remove previous listeners automatically, so no need to remove after update)
  $('.main-word__text-0').hover(
    function (event) {
      // change the position to the currently hovered text
      const bbox = $(this)[0].getBoundingClientRect();

      // update position and display attr
      $('#button-close').css({
        'top': bbox ? bbox.top - 60 : 0,
        'left': bbox ? bbox.left : 0,
        'display': 'block'
      });
    },
    () => {
      $('#button-close').css({
        'display': 'none'
      });
    }
  );
}

function toggleInput(showContainer, showCheck, showClose) {
  // display text input
  const input = $('.word-input');

  input.css({
    'display': showCheck ? 'block' : 'none'
  });

  // delete anything that has been written before
  input.val('');
  // put focus on input so that typing can be done immediately
  $('#word-input-left').focus();

  // display check button
  $('#button-check').css({
    'display': showCheck ? 'block' : 'none'
  });

  // if input should be shown, container should hide and otherwise
  const container = $('#viz-wrapper-diff');
  const animationDuration = 700;

  container
    .animate({
      'opacity': +showContainer
    }, animationDuration, () => {
      container.css({
        'display': showContainer ? 'block' : 'none'
      });
    });

  // as well as close button should behave the same as container
  $('#button-close').css({
    'display': showClose ? 'block' : 'none'
  });
}

function wordClick(d) {
  // change query word to the clicked word - always replace the right one
  submit(d.text, queryLeft);
}

function toggleEventsOnContainer(enabled, delay) {
  // select container wrapper, circles and texts
  const elements = $('#viz-wrapper-diff').add('.word__circle').add('.word__text');

  if (delay) {
    // enable mouse events after the animation's finished so that it is not interrupted and stopped
    setTimeout(() => {
      elements
        .css({
          'pointer-events': enabled ? 'auto' : 'none'
        });
    }, 3000);

  } else {
    // change the pointer events setting accordingly
    elements
      .css({
        'pointer-events': enabled ? 'auto' : 'none'
      });
  }
}

function addButtonListeners() {
  $('#button-close')
    .click(function (event) {
      tooltip.hide();

      toggleInput(false, true, false);

      // clear input
      $('.word-input').val('');
    })
    .hover(function (event) {
      // keep the button visible
      if (!$('#button-check').is(':visible')) {
        $(this).css({
          'display': 'block'
        });
      }
    });

  $('#button-check')
    .click(function (event) {
      submit($('#word-input-left').val(), $('.word-input-right').val());
    })
    .hover(
      function () {
        $(this).css({
          'background': 'rgb(15, 135, 135)'
        });
      },
      function () {
        $(this).css({
          'background': 'rgb(50, 200, 200)'
        });
      }
    );
}

function positionInputs() {
  const inputWidth = 120;

  // left input wrapper
  $('#word-input-left-wrapper')
    .css({
      'top': middlePosition ? middlePosition.top - 80 : 0,
      'left': middlePosition ? middlePosition.left - inputWidth * 1.25 : 0
    });

  // right input wrapper
  $('#word-input-right-wrapper')
    .css({
      'top': middlePosition ? middlePosition.top - 80 : 0,
      'left': middlePosition ? middlePosition.left + inputWidth * 0.25 : 0
    });

  // left input
  $('#word-input-left')
    .css({
      'width': inputWidth,
      'border-color': viz._scale.scoreColor.range()[0]
    })
    .keydown(function inputChange(event) {
      if (event.keyCode === 13) {
        submit($(this).val(), $('#word-input-right').val());
      }
    });

  // right input
  $('#word-input-right')
    .css({
      'width': inputWidth,
      'border-color': viz._scale.scoreColor.range()[0]
    })
    .keydown(function inputChange(event) {
      if (event.keyCode === 13) {
        submit($('#word-input-left').val(), $(this).val());
      }
    });
}

function addInput() {
  const svgPosition = $('svg').position();

  middlePosition = {
    left: svgPosition.left + $('svg').width() / 2,
    top: svgPosition.top + $('svg').height() / 2
  };

  positionInputs();

  updateButtons();

  addButtonListeners();

  $('#loading')
    .css({
      'top': middlePosition ? middlePosition.top - $('#loading').height() / 2 - 65 : 0,
      'left': middlePosition ? middlePosition.left - $('#loading').width() / 2 : 0
    });

}

function toggleInputsNotification() {
  // can take time, needs to be after the update function was called
  $('#loading').fadeOut();

  toggleInput(true, false, false);

  toggleEventsOnContainer(true, true);

  updateButtons();

  history.pushState({ 'left': queryLeft, 'right': queryRight },
    `Words - ${queryRight} - ${queryLeft}`, `?left=${queryRight};right=${queryLeft}`); // words are switched
}

function getSimilarityText(score) {
  // find out to which explanation the word falls into
  // get all ticks from viz
  const vizTicks = viz._params.tick.values;

  // higher score number - absolute terms
  const maxDiff = Math.max(Math.abs(vizTicks[0].value), Math.abs(vizTicks[vizTicks.length - 1].value));
  // because of extra space on the sides, a 'bigger third' needs to be taken
  const thirdScoreLen = (maxDiff * 2) / 6;

  // score falls into first category
  if (score >= thirdScoreLen) {
    return `more frequent with ${viz._data.mainWords[0].text}`;
  }

  // score falls into the middle category
  if (score > -thirdScoreLen && score < thirdScoreLen) {
    return 'equally frequent with both';
  }

  // score falls into the last category
  return `more frequent with ${viz._data.mainWords[1].text}`;
}

function tooltipContent(d) {
  const similarityTextColor = viz._scale.scoreColor(d.score);
  const similarityText = `<span style="color: ${similarityTextColor}">${getSimilarityText(d.score)}</span>`;
  const score = `<div class='tooltip-info tooltip-info__score'>${d.text} is ${similarityText}</div>`;

  let freq;

  if (d.freq) {
    // if freq is given, circles are hovered
    const freqTextSize = Math.round(fontSize(d.freq));
    const formattedFreq = d.freq.toLocaleString();
    const mainWord = d.classSuffix === 'right' ? viz._data.mainWords[0].text : viz._data.mainWords[1].text;

    freq = `<div class='tooltip-info tooltip-info__freq'>
      <span style="font-size: ${freqTextSize}px">
        ${formattedFreq}
      </span>
    </div>
    <div> times found with ${mainWord}</div>`;

  } else {
    // the word text is hovered
    const overallFreq = d.words[0].freq + d.words[1].freq;
    const freqTextSize = Math.round(fontSize(overallFreq));
    const formattedFreq = overallFreq.toLocaleString();

    freq = `<div class='tooltip-info tooltip-info__freq'>
      <span style="font-size: ${freqTextSize}px">
        ${formattedFreq}
      </span>
    </div>
    <div> times found overally</div>`;
  }

  return score + freq;
}

function getParams() {
  const width = Math.max($('.col-viz').width(), 400);
  const height = Math.max(window.innerHeight * 0.8, 300);

  let margin;
  let maxItems;
  let tickNumber;
  let circleSize;
  let textSize;

  const minSize = 0;

  if (width < 400 || height < 400) {
    margin = { top: 30, right: 10, bottom: 30, left: 10 };
    maxItems = 4;
    tickNumber = 2;
    circleSize = [minSize, 30];
    textSize = [13, 28];
  } else if (width < 700 || height < 500) {
    margin = { top: 30, right: 10, bottom: 30, left: 10 };
    maxItems = 10;
    tickNumber = 5;
    circleSize = [minSize, 30];
    textSize = [13, 28];
  } else {
    margin = { top: 20, right: 80, bottom: 80, left: 80 };
    maxItems = 20;
    tickNumber = 7;
    circleSize = [minSize, 50];
    textSize = [13, 40];
  }

  return {
    width,
    height,
    margin,
    maxItems,
    tickNumber,
    circleSize,
    textSize
  };
}

function animateText() {
  $('.info-about').each(function (i) {
    $(this).delay(1000 + 500 * i).fadeTo(2000, 1);
  });

  $('.info-intro-animate').each(function (i) {
    $(this).delay(1500 + 200 * i).fadeTo(3000, 1);
  });
}

function animateOptions() {
  $('#options-wrapper').delay(2500).fadeTo(1000, 1);

  $('#words-wrapper').delay(2000).fadeTo(1000, 1);
}

function updateWordLabels() {
  $('#word-left').css({
    color: d3.color(viz._scale.scoreColor.range()[0]).brighter(1)
  });

  $('#word-right').css({
    color: d3.color(viz._scale.scoreColor.range()[1]).brighter(1)
  });

  $('#word-left').text(queryRight);
  $('#word-right').text(queryLeft);
}

function createFontSizeScale() {
  // create scale for tooltip freq font size - this cannot be taken from viz as different domain needs to be used
  fontSize = d3.scaleLinear()
    .domain([viz._params.freq[0], viz._scale.fontSize.domain()[1]])
    .range(params.textSize);
}

function createURL(word1, word2) {
  const url = 'https://api.sketchengine.co.uk/corpus/wsdiff?';
  const query = `corpname=aclarc_1;lemma=${word1};lemma2=${word2};format=json;`;
  const auth = 'api_key=866OO8C77EYVME7VUFR0E00GO3G2RTCQ;username=visualisations';

  return `${url}${query}${auth}`;
}

function rerenderViz() {
  params = getParams();

  // create new query and update vis
  parseURL(createURL(queryLeft, queryRight), 'WS_DIFF')
    .then(data => {

      toggleNotification(false);

      // remove the old svg and recreate it with new params
      $('svg').remove();

      try {
        viz = createOpposite(data, selectedOption);

        updateWordLabels();

        createFontSizeScale();

        toggleInputsNotification();

      } catch (e) {
        toggleNotification(true, e);
      }

    }, error => {

      $('#loading').fadeOut();

      toggleNotification(true, error);
    });
}

function addOptionListeners() {
  $('.option').click(function (option) {
    // remove class from the previous value
    $('.option.active').removeClass('active');
    // and update the clicked element
    $(this).addClass('active');

    // trigger new visualization
    toggleEventsOnContainer(false);

    tooltip.hide();

    selectedOption = $(option.target).attr('data-value');

    rerenderViz();
  });
}

function submit(valueRight, valueLeft) {
  toggleInput(false, false, false);

  $('#loading').fadeIn();

  if (valueLeft && valueRight) {
    // accept only one word - first if there are more typed in
    queryLeft = valueLeft.split(' ')[0].split(';')[0];
    queryRight = valueRight.split(' ')[0].split(';')[0];

    toggleEventsOnContainer(false);

    tooltip.hide();

    // create new query and update vis
    parseURL(createURL(queryLeft, queryRight), 'WS_DIFF')
      .then(data => {

        viz = viz.update(data);

        updateWordLabels();

        toggleInputsNotification();

        createFontSizeScale();

      }, error => {

        $('#loading').fadeOut();

        toggleNotification(true, error);

      });

  } else {

    // show info in tooltip
    toggleNotification(true, 'Please enter two words');

    $('#loading').fadeOut();
  }
}

(function init() {

  if ($('#viz-wrapper-diff').length) {

    // animate the text containing explanations
    animateText();

    // animate the options - appearing as the last ones
    animateOptions();

    toggleEventsOnContainer(false);

    params = getParams();

    // check if the URL states a word that should be shown
    const urlQuery = window.location.search.substring(1);

    if (urlQuery) {
      const leftMatch = /left=(.+);/.exec(urlQuery)[1];
      const rightMatch = /right=(.+);?/.exec(urlQuery)[1];

      queryLeft = leftMatch || queryLeft;
      queryRight = rightMatch || queryRight;
    }

    // create visualization and keep reference to it
    parseURL(createURL(queryLeft, queryRight), 'WS_DIFF')
      .then(data => {
        tooltip = tip()
          .attr('class', 'd3-tip')
          .offset([-6, 0])
          .html(tooltipContent);

        viz = createOpposite(data, selectedOption);

        updateWordLabels();

        createFontSizeScale();

        toggleEventsOnContainer(true, true);

        viz._svg.call(tooltip);

        addInput();

        addOptionListeners();
      });

    $(window).on('resize', debounce(rerenderViz, 300));
  }
})();
