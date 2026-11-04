'use strict';

angular.module('NamesModule').controller('SearchController', [
  '$scope', '$state', 'NamesService', 'toastr', '$localStorage',
  function ($scope, $state, api, toastr, $localStorage) {
    $scope.search = $scope.search || {};
    api.getCachedNames(function (names) {
      $scope.names = (names || []).map(function (entry) {
        return { word: entry.word || entry.name, name: entry.word || entry.name };
      });
    });

    $scope.exec_search = function () {
      var query = ($scope.search.entry || '').trim();
      if (!query) return;
      return api.getAllNames().success(function (entries) {
        var normalizedQuery = query.toLocaleLowerCase();
        var matches = (entries || []).filter(function (entry) {
          var word = entry.word || entry.name || '';
          return word.toLocaleLowerCase().indexOf(normalizedQuery) !== -1;
        }).map(function (entry) {
          var word = entry.word || entry.name;
          return { name: word, word: word, state: entry.state };
        });
        var exact = matches.filter(function (entry) {
          return entry.word.toLocaleLowerCase() === normalizedQuery;
        })[0];
        if (exact) return $state.go('auth.words.edit_entries', { entry: exact.word });
        if (!matches.length) return toastr.warning('No entries found for ' + query);
        $localStorage.searchResults = matches;
        return $state.go('auth.words.search', { entry: query });
      });
    };
  }
]);