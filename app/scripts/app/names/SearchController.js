'use strict';

angular.module('NamesModule').controller('SearchController', [
  '$scope', '$state', 'NamesService', 'toastr', '$localStorage',
  function ($scope, $state, api, toastr, $localStorage) {
    function normalizeSearchText(value) {
      return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
    }

    function mapNames(entries) {
      return (entries || []).map(function (entry) {
        return { word: entry.word || entry.name, name: entry.word || entry.name };
      });
    }

    $scope.searchByWord = function (query) {
      var normalizedQuery = normalizeSearchText(query);
      return function (entry) {
        var word = entry.word || entry.name || '';
        return normalizeSearchText(word).indexOf(normalizedQuery) !== -1;
      };
    };

    $scope.searchNamesRefreshStarted = false;
    $scope.refreshNamesOnTyping = function (query) {
      if (!query) {
        $scope.searchNamesRefreshStarted = false;
        return;
      }
      if ($scope.searchNamesRefreshStarted) return;

      $scope.searchNamesRefreshStarted = true;
      api.refreshNames(function (names) {
        $scope.names = mapNames(names);
      });
    };

    $scope.search = $scope.search || {};
    api.getCachedNames(function (names) {
      $scope.names = mapNames(names);
    });

    $scope.exec_search = function () {
      var query = ($scope.search.entry || '').trim();
      if (!query) return;
      return api.getAllNames().success(function (entries) {
        var normalizedQuery = normalizeSearchText(query);
        var literalQuery = query.normalize('NFC').toLocaleLowerCase();
        var matches = (entries || []).filter(function (entry) {
          var word = entry.word || entry.name || '';
          return normalizeSearchText(word).indexOf(normalizedQuery) !== -1;
        }).map(function (entry) {
          var word = entry.word || entry.name;
          return { name: word, word: word, state: entry.state };
        });
        var literalExact = matches.filter(function (entry) {
          return entry.word.normalize('NFC').toLocaleLowerCase() === literalQuery;
        })[0];
        var normalizedExact = matches.filter(function (entry) {
          return normalizeSearchText(entry.word) === normalizedQuery;
        });
        var exact = literalExact || (normalizedExact.length === 1 ? normalizedExact[0] : null);
        if (exact) return $state.go('auth.words.edit_entries', { entry: exact.word });
        if (!matches.length) return toastr.warning('No entries found for ' + query);
        $localStorage.searchResults = matches;
        return $state.go('auth.words.search', { entry: query });
      });
    };
  }
]);
