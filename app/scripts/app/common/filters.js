'use strict';
angular.module('CommonModule')  /**
 * Filter to parse delimated string to arrays
 */.filter('sToArray', function () {
  return function (text, delimeter) {
    if (!text || !delimeter)
      return text;
    return text.split(delimeter);
  };
})  /**
 * Filter to parse input value arrays to single inline strings
 */.filter('aToString', function () {
  return function (inputArray, delimeter) {
    if (!inputArray)
      return '';
    inputArray = inputArray.reverse();
    var val = '';
    for (var i = inputArray.length - 1; i >= 0; i--) {
      val += inputArray[i].text;
      if (i !== 0) {
        val += delimeter;
      }
    }
    return val;
  };
})  /**
 * Filter to parse input value array to date string
 */.filter('toDateString', [
  '$filter',
  function ($filter) {
    return function (inputArray) {
      // console.log(typeof inputArray)
      if (typeof inputArray !== 'object')
        return;
      var date = $filter('limitTo')(inputArray, 3);
      date = date.join('-');
      return $filter('date')(date, 'mediumDate');
    };
  }
]).filter('timeAgo', function () {
  // Relative time for an ISO date string, e.g. "just now", "5m ago", "3h ago", "2d ago".
  return function (input) {
    if (!input)
      return '—';
    var seconds = Math.max(0, (Date.now() - new Date(input).getTime()) / 1000);
    if (isNaN(seconds))
      return '—';
    if (seconds < 60)
      return 'just now';
    var units = [['d', 86400], ['h', 3600], ['m', 60]];
    for (var i = 0; i < units.length; i++) {
      if (seconds >= units[i][1])
        return Math.floor(seconds / units[i][1]) + units[i][0] + ' ago';
    }
  };
}).filter('isRecent', function () {
  // True when the ISO date string is within the given number of minutes (default 15).
  return function (input, minutes) {
    if (!input)
      return false;
    return Date.now() - new Date(input).getTime() < (minutes || 15) * 60000;
  };
}).filter('capitalize', function () {
  return function (input) {
    if (!input)
      return;
    // input will be the string we pass in if (input)
    return input[0].toUpperCase() + input.slice(1).toLowerCase();
  };
}).filter('commaSeparated', function () {
  return function (input) {
    if (Array.isArray(input))
      return input.join(', ');
    return input;
  };
})  /**
 * Filter to parse input value array to comma separated list
 */.filter('list', [
  '$filter',
  '_',
  function ($filter, _) {
    return function (inputArray) {
      if (typeof inputArray !== 'object')
        return;
      return _.pluck(inputArray, 'place').join(', ');
    };
  }
]);