"use strict";

/* Controllers */
angular
  .module("NamesModule")
  .controller("NamesAddEntriesCtrl", [
    "$rootScope",
    "$scope",
    "NamesService",
    function($rootScope, $scope, namesService) {
      $scope.new = true;
      $scope.word = {};
      $scope.submit = function() {
        return namesService.addName($scope.word, function() {
          // reset the form models fields
          $scope.word = {};
        });
      };

      $scope.publish = function() {
        console.log(
          "Each new word must go through review before getting published."
        );
      };

      $scope.generate_glossary = function() {
        // split the morphology with the dashes if it's not empty
        if ($scope.word.morphology) {
          var etymology = $scope.word.etymology;
          var splitMorphology = $scope.word.morphology.split("-");
          // add each entry to etymology list if it does not exist already
          for (var i = 0; i < splitMorphology.length; i++) {
            var newPart = splitMorphology[i];
            var oldPart = etymology[i];
            if (!oldPart) {
              etymology.push({
                part: newPart,
                meaning: ""
              });
            } else {
              oldPart.part = newPart;
            }
          }
          $scope.word.etymology = etymology.slice(0, splitMorphology.length);
        }
      };
    }
  ])
  .controller("namesEditEntryCtrl", [
    "$scope",
    "$stateParams",
    "$state",
    "NamesService",
    "toastr",
    "$window",
    function($scope, $stateParams, $state, namesService, toastr, $window) {
      var originalName = null;
      namesService.prevAndNextNames($stateParams.entry, function(prev, next) {
        $scope.prev = prev;
        $scope.next = next;
      });
      namesService.getName($stateParams.entry, false, function(resp) {
        $scope.word = resp;
        originalName = resp.word;
        // hack for words without etymology
        if (!resp.etymology.length) {
          $scope.word.etymology.push({
            part: "",
            meaning: ""
          });
        }
        if (!resp.definitions.length) {
          $scope.word.definitions.push({
            content: "",
            englishTranslation: "",
            examples: []
          });
        }
      });

      $scope.generate_glossary = function() {
        // split the morphology with the dashes if it's not empty
        if ($scope.word.morphology) {
          var etymology = $scope.word.etymology;
          var splitMorphology = $scope.word.morphology.split("-");
          // add each entry to etymology list if it does not exist already
          for (var i = 0; i < splitMorphology.length; i++) {
            var newPart = splitMorphology[i];
            var oldPart = etymology[i];
            if (!oldPart) {
              etymology.push({
                part: newPart,
                meaning: ""
              });
            } else {
              oldPart.part = newPart;
            }
          }
          $scope.word.etymology = etymology.slice(0, splitMorphology.length);
        }
      };

      $scope.publish = function() {
        // update name first, then publish
        return namesService.updateName(originalName, $scope.word, function() {
          // first remove name from index
          namesService.removeNameFromIndex($scope.word.word);
          // then add name back to index
          return namesService
            .addNameToIndex($scope.word.word)
            .success(function() {
              $scope.word.state = "PUBLISHED";
              $scope.word.indexed = true;
              toastr.info($scope.word.word + " has been published");
              return $window.history.back();
            });
        });
      };
      $scope.goto = function(entry) {
        namesService.updateName(originalName, $scope.word);
        return $state.go("auth.names.edit_entries", { entry: entry });
      };
      $scope.submit = function() {
        return namesService.updateName(originalName, $scope.word);
      };
      $scope.delete = function() {
        if (
          $window.confirm(
            "Are you sure you want to delete " + $scope.word.word + "?"
          )
        ) {
          return namesService.deleteName($scope.word, function() {
            return $window.history.back();
          });
        }
      };
    }
  ])
  .controller("namesListEntriesCtrl", [
    "$scope",
    "NamesService",
    "$stateParams",
    "$window",
    "toastr",
    function($scope, namesService, $stateParams, $window, toastr) {
      $scope.wordsList = [];
      $scope.status = $stateParams.status;
      $scope.count = 50;
      $scope.pagination = { current: 1 };
      $scope.sort = function(keyname) {
        $scope.sortKey = keyname;
        //set the sortKey to the param passed
        $scope.reverse = !$scope.reverse; //if true make it false and vice versa
      };
      namesService.countNames($stateParams.status, function(num) {
        $scope.wordsListItems = num;
      });
      $scope.fetch = function(newPageNumber, count) {
        return namesService
          .getNames({
            status: $stateParams.status,
            page: newPageNumber || 1,
            count: count || $scope.itemsPerPage || $scope.count || 50
          })
          .success(function(responseData) {
            $scope.wordsList = [];
            $scope.pagination.current = newPageNumber || 1;
            responseData.forEach(function(name) {
              $scope.wordsList.push(name);
            });
          });
      };
      $scope.fetch();
      $scope.delete = function(entry) {
        if (
          entry &&
          $window.confirm("Are you sure you want to delete " + entry.word + "?")
        ) {
          return namesService.deleteName(
            entry,
            function() {
              $scope.wordsList.splice($scope.wordsList.indexOf(entry), 1);
              $scope.wordsListItems--;
            },
            $scope.status
          );
        }
        var entries = $.map($scope.wordsList, function(elem) {
          if (elem.isSelected === true) return elem;
        });
        if (!entries.length) return toastr.warning("Select words to delete");
        if (
          !$window.confirm(
            "Are you sure you want to delete the selected words?"
          )
        )
          return;
        return namesService.deleteNames(
          entries,
          function() {
            $scope.fetch($scope.pagination.current, $scope.itemsPerPage);
          },
          $scope.status
        );
      };
      $scope.indexName = function(entry) {
        if (entry.state === "NEW")
          return namesService.addNameToIndex(entry.word).success(function() {
            entry.state = "PUBLISHED";
            entry.indexed = true;
          });
        else if (entry.state === "MODIFIED")
          return namesService.addNameToIndex(entry.word).success(function() {
            entry.state = "PUBLISHED";
            entry.indexed = true;
          });
        // assume entry is published and objective is to unpublish it
        else
          return namesService
            .removeNameFromIndex(entry.word)
            .success(function() {
              entry.indexed = false;
              entry.state = "NEW";
            });
      };
      $scope.republishNames = function() {
        var entries = $.map($scope.wordsList, function(elem) {
          if (elem.isSelected === true) return elem;
        });
        if (!entries.length)
          return toastr.warning("No words selected to republish");
        return namesService.removeNamesFromIndex(entries).success(function() {
          return namesService.addNamesToIndex(entries).success(function() {
            $.map(entries, function(entry) {
              entry.state = "PUBLISHED";
              entry.indexed = true;
            });
            toastr.success(entries.length + " words have been republished");
          });
        });
      };
      $scope.indexNames = function(action) {
        var entries = $.map($scope.wordsList, function(elem) {
          if (elem.isSelected === true) return elem;
        });
        if (entries.length > 0) {
          if (!action || action === "add") {
            namesService
              .addNamesToIndex(entries)
              .success(function() {
                $.map(entries, function(entry) {
                  entry.indexed = true;
                  entry.state = "PUBLISHED";
                });
                toastr.success(entries.length + " words have been published");
              })
              .error(function() {
                toastr.error("Selected words could not be published");
              });
          } else {
            namesService
              .removeNamesFromIndex(entries)
              .success(function() {
                $.map(entries, function(entry) {
                  entry.indexed = false;
                  entry.state = "NEW";
                });
                toastr.success(entries.length + " words unpublished");
              })
              .error(function() {
                return toastr.error("Selected words could not be unpublished");
              });
          }
        } else {
          toastr.warning("No words selected");
        }
      };
      // Accept Suggested Name/s
      $scope.accept = function(entry) {
        if (entry) return acceptSuggestedName(entry);
        var entries = $.map($scope.wordsList, function(elem) {
          if (elem.isSelected === true) return elem;
        });
        if (entries.length > 0) {
          return entries.forEach(function(entry) {
            acceptSuggestedName(entry);
          });
        } else toastr.warning("Please select words to accept.");
      };
      /**
       * Adds the suggested name to the list of words eligible to be added to search index
       */
      var acceptSuggestedName = function(entry) {
        // Change the state of the 'SUGGESTED' name TO 'NEW' to put it on the review queue
        entry.state = "NEW";
        if (!$.isEmptyObject(entry)) {
          return namesService.updateName(entry.word, entry, function() {
            $scope.wordsList.splice($scope.wordsList.indexOf(entry), 1);
          });
        }
      };
    }
  ])
  .controller("namesByUserListCtrl", [
    "$scope",
    "NamesService",
    "$window",
    function($scope, namesService, $window) {
      $scope.wordsList = [];
      namesService
        .getNames({ submittedBy: $scope.user.email })
        .success(function(responseData) {
          $scope.wordsListItems = responseData.length;
          $scope.wordsList = [];
          responseData.forEach(function(name) {
            $scope.wordsList.push(name);
          });
        });
      $scope.$on("onRepeatLast", function() {
        $("#user_list").listnav({
          filterSelector: ".ul_name",
          includeNums: false,
          removeDisabled: true,
          showCounts: false,
          onClick: function() {
            $scope.wordsListItems = $window.document.getElementsByClassName(
              "listNavShow"
            ).length;
            $scope.$apply();
          }
        });
      });
    }
  ])
  .controller("nameSearchCtrl", [
    "$controller",
    "$scope",
    "$stateParams",
    "$localStorage",
    function($controller, $scope, $stateParams, $localStorage) {
      if ($stateParams.entry) {
        $scope.search = { entry: $stateParams.entry };
        $controller("SearchController", { $scope: $scope });
        $scope.results = $localStorage.searchResults;
      }
    }
  ])
  .controller("namesFeedbacksCtrl", [
    "$scope",
    "NamesService",
    "$window",
    "toastr",
    function($scope, namesService, $window) {
      $scope.count = 50;
      $scope.feedbacks = [];
      $scope.pagination = { current: 1 };
      $scope.sort = function(keyname) {
        $scope.sortKey = keyname;
        //set the sortKey to the param passed
        $scope.reverse = !$scope.reverse; //if true make it false and vice versa
      };
      $scope.fetch = function(newPageNumber) {
        return namesService.getRecentFeedbacks(function(responseData) {
          $scope.pagination.current = newPageNumber || 1;
          $scope.feedbacks = [];
          responseData.forEach(function(n) {
            $scope.feedbacks.push(n);
          });
        });
      };
      $scope.fetch();
      $scope.delete = function(entry) {
        // delete listed feedback entry
        if (
          entry &&
          $window.confirm(
            "Are you sure you want to delete this feedback on " +
              entry.word +
              "?"
          )
        ) {
          return namesService.deleteFeedback(entry.id, function() {
            $scope.feedbacks.splice($scope.feedbacks.indexOf(entry), 1); // $scope.count--
          });
        }
      };
      // noop function as there's no option for mass feedback delete by ids
      $scope.deleteAll = function() {};
    }
  ]);
