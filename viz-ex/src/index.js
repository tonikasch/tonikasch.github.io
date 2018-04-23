import * as d3 from 'd3';
import tip from 'd3-tip';

import $ from 'jquery';
import debounce from 'lodash/debounce';

import { RadialViz, parseURL } from 'ske-viz';

let viz;
let tooltip;
let params;
let middlePosition;

const inputWidth = 120;

// initial query word - 'word'
const initialQuery = 'word'; // other possibilities: 'idea'
let queryWord;

function createRadial(data) {
  return RadialViz(data,
    {
      viz: {
        divId: 'viz-wrapper',
        maxItems: params.maxItems,
        width: params.width,
        height: params.height,
        margin: params.margin
      },
      tick: {
        scoreColor: true,
        number: params.tickNumber,
        color: 'rgba(0, 64, 74, 0.8)'
      },
      circle: {
        size: params.circleSize,
        color: ['rgb(136, 86, 167)', 'rgb(0, 185, 185)'],
        mouseover: showTooltip,
        mouseout: tooltip.hide
      },
      text: {
        scale: true,
        font: 'Metrophobic, Helvetica, Arial, sans-serif',
        color: 'white',
        size: params.textSize,
        mouseover: showTooltip,
        mouseout: tooltip.hide,
        mouseclick: wordClick
      },
      category: {
        show: false,
        diff: false
      }
    }
  );
}

function showTooltip(d) {
  const selectedCircle = d3.select('#word__circle-' + d.id);

  tooltip.show(d, selectedCircle._groups[0][0]);
}

function toggleNotification(show, text) {
  const notification = $('.notification');

  if (show) {
    // the text shown in notification
    let notificationText = typeof text === 'string' ? text : text.toString();
    // remove special characters, so that text is not confusing
    const shortenedText = /(.+)-\w/g.exec(notificationText);

    if (shortenedText) {
      notificationText = shortenedText[1];
    } else {
      notificationText = text;
    }

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

function updateButtonPositions() {
  // update position
  $('#button-close').css({
    'top': middlePosition.top - 100,
    'left': middlePosition.left - 15
  });

  $('#button-check').css({
    'top': middlePosition.top - 90,
    'left': middlePosition.left - 15
  });

  // add listener (jQuery will remove previous listeners automatically, so no need to remove after update)
  $('.main-word__circle').hover(
    () => {
      $('#button-close').css({
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

function updateInputPosition() {
  $('#word-input-wrapper')
    .css({
      'top': middlePosition.top - 120,
      'left': middlePosition.left - inputWidth / 2
    });
}

function toggleInput(showContainer, showCheck, showClose) {
  // display text input
  const input = $('#word-input');

  input.css({
    'display': showCheck ? 'block' : 'none'
  });

  // delete anything that has been written before
  input.val('');
  // put focus on input so that typoing can be done immediately
  input.focus();

  // display check button
  $('#button-check').css({
    'display': showCheck ? 'block' : 'none'
  });

  // if input should be shown, container should hide and otherwise
  const container = $('#viz-wrapper');
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
  // differ between query word and other words
  if (d.text === viz._data.mainWord.text) {
    // if main word has been selected, show the form
    toggleInput(false, true, false);

    tooltip.hide();
  } else {
    // otherwise change query word to the clicked word
    submit(d.text);
  }
}

function toggleEventsOnContainer(enabled, delay) {
  // select container wrapper, circles and texts
  const elements = $('#viz-wrapper').add('.word__circle').add('.word__text');

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
      $('#word-input').val('');
    })
    .hover(function (event) {
      // keep mouse event on main word circle - event has to be generated
      viz._svg.select('.main-word__circle').each(function (d, i) {
        const onMouseover = d3.select(this).on('mouseover');

        tooltip.show(d);

        onMouseover.apply(this, [d, i]);
      });

      // keep the button visible
      if (!$('#button-check').is(':visible')) {
        $(this).css({
          'display': 'block'
        });
      }
    });

  $('#button-check')
    .click(function (event) {
      submit($('#word-input').val());
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

function addInput() {
  middlePosition = $('.main-word__circle').position();

  $('#word-input-wrapper')
    .css({
      'top': middlePosition.top - 120,
      'left': middlePosition.left - inputWidth / 2
    });

  $('#word-input')
    .css({
      'width': inputWidth,
      'border-color': viz._scale.scoreColor.range()[1]
    })
    .keydown(function inputChange(event) {
      if (event.keyCode === 13) {
        submit($(this).val());
      }
    });

  updateButtonPositions();

  addButtonListeners();

  $('#loading')
    .css({
      'top': middlePosition.top - $('#loading').height() / 2 - 93,
      'left': middlePosition.left - $('#loading').width() / 2
    });

}

function getSimilarityText(score) {
  // find out to which explanation the word falls into
  // get all ticks from viz
  const vizTicks = viz._params.tick.values;

  // define values for explanations
  const maxValueTick = vizTicks[0].value;
  const minValueTick = vizTicks[vizTicks.length - 1].value;
  const middleValueTick = minValueTick + (maxValueTick - minValueTick) / 2;

  const halfTickDifference = (maxValueTick - middleValueTick) / 2;

  // score falls into first category
  if (score >= maxValueTick - halfTickDifference) {
    return 'very similar';
  }

  // score falls into the middle category
  if (score > middleValueTick - halfTickDifference && score < middleValueTick + halfTickDifference) {
    return 'somehow similar';
  }

  // score falls into the last category
  return 'loosely similar';
}

function tooltipContent(d) {
  const freqTextSize = Math.round(viz._scale.fontSize(d.freq));
  const formattedFreq = d.freq.toLocaleString();
  const freq = `<div class='tooltip-info tooltip-info__freq'>
    <span style="font-size: ${freqTextSize}px">
      ${formattedFreq}
    </span>
  </div>
  <div> times found</div>`;

  if (d.text === viz._data.mainWord.text) {
    // main word text
    return freq;

  } else if (d.text && d.freq) {
    // regular word information
    const similarityTextColor = viz._scale.scoreColor(d.score);
    const similarityText = `<span style="color: ${similarityTextColor}">${getSimilarityText(d.score)}</span>`;
    const score = `<div class='tooltip-info tooltip-info__score'>
      ${d.text} is ${similarityText} to ${viz._data.mainWord.text}
    </div>`;

    return score + freq;
  }

  return d.text;
}

function getParams() {
  const width = $('.col-viz').width();
  const height = window.innerHeight;
  const size = Math.max(100, Math.min(width, height, 800));

  let margin;
  let maxItems;
  let tickNumber;
  let circleSize;
  let textSize;

  if (size < 400) {
    margin = { top: 50, right: 50, bottom: 50, left: 50 };
    maxItems = 5;
    tickNumber = 2;
    circleSize = [10, 30];
    textSize = [13, 30];
  } else {
    margin = { top: 150, right: 150, bottom: 200, left: 150 };
    maxItems = 20;
    tickNumber = 3;
    circleSize = [10, 50];
    textSize = [13, 40];
  }

  return {
    width: size,
    height: size,
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

function createURL(word) {
  const url = 'https://api.sketchengine.co.uk/corpus/thes?';
  const query = `corpname=aclarc_1;lemma=${word};lpos=;format=json;`;
  const auth = 'api_key=866OO8C77EYVME7VUFR0E00GO3G2RTCQ;username=visualisations';

  return `${url}${query}${auth}`;
}

function submit(value) {
  toggleInput(false, false, false);

  $('#loading').fadeIn();

  if (value) {
    // accept only one word - first if there are more typed in
    const newWord = value.split(' ')[0].split(';')[0];

    toggleEventsOnContainer(false);

    tooltip.hide();

    // create new query and update vis
    parseURL(createURL(newWord), 'THES')
      .then(data => {

        viz = viz.update(data);

        queryWord = newWord;

        // can take time, needs to be after the update function was called
        $('#loading').fadeOut();

        toggleInput(true, false, false);

        toggleEventsOnContainer(true, true);

        updateButtonPositions();

        history.pushState({ 'text': newWord }, `Word - ${newWord}`, `?${newWord}`);
      }, error => {

        $('#loading').fadeOut();

        toggleNotification(true, error);
      });

  } else {

    // show info in tooltip
    toggleNotification(true, 'Please enter a word');

    $('#loading').fadeOut();
  }
}

function rerenderViz() {
  parseURL(createURL(queryWord), 'THES')
    .then(data => {

      // remove the old svg and recreate it with new params
      $('svg').remove();

      viz = createRadial(data);

      // can take time, needs to be after the update function was called
      $('#loading').fadeOut();

      toggleInput(true, false, false);

      toggleEventsOnContainer(true, true);

      middlePosition = $('.main-word__circle').position();

      updateButtonPositions();

      updateInputPosition();

    }, error => {

      $('#loading').fadeOut();

      toggleNotification(true, error);
    });
}

(function init() {

  if ($('#viz-wrapper').length) {
    // animate the text containing explanations
    animateText();

    toggleEventsOnContainer(false);

    params = getParams();

    // check if the URL states a word that should be shown
    const query = window.location.search ? window.location.search.substring(1) : initialQuery;

    // create visualization and keep reference to it
    parseURL(createURL(query), 'THES')
      .then(data => {
        tooltip = tip()
          .attr('class', 'd3-tip')
          .offset([-6, 0])
          .html(tooltipContent);

        queryWord = query;

        viz = createRadial(data);

        toggleEventsOnContainer(true, true);

        viz._svg.call(tooltip);

        addInput();
      });

    $(window).on('resize', debounce(rerenderViz, 300));
  }

})();
