/* globals confirm */

"use strict";

var GLOSSARY_REGENERATE_PROMPT = "Do you want to automatically generate gloss from this morphology value?" +
  "\nSelect Cancel/No to leave as is.";
var GLOSSARY_FETCH_SUCCESS = "Gloss generated from morphology. Please review and adjust as needed.";
var GLOSSARY_FETCH_ERROR = "Could not generate gloss from morphology.";
var GLOSSARY_RECHECK_WARNING = "Please, re-check gloss before saving/publishing as some parts might have been removed/changed.";
var PUBLISH_REVIEW_WARNING_PREFIX = "The following reviewed definitions will become publicly visible after publish:";
var PUBLISH_REVIEW_WARNING_SUFFIX = "\n\nContinue publishing?";

function notifySubmittedMeanings(toastr, namesEtymologyWorkflow, submissionResult) {
  var message = namesEtymologyWorkflow.formatSubmittedMeaningsMessage(submissionResult);
  if (message) {
    toastr.info(message, null, {
      timeOut: 0,
      extendedTimeOut: 0,
      closeButton: true,
      tapToDismiss: false
    });
  }
}

function submitMissingDefinitionsWithNotify(scope, etymologyService, namesEtymologyWorkflow, toastr) {
  return etymologyService.submitMissingDefinitions(scope.word.etymology)
    .then(function (submissionResult) {
      notifySubmittedMeanings(toastr, namesEtymologyWorkflow, submissionResult);
      return submissionResult;
    });
}

function generateGlossary(scope, etymologyService, namesEtymologyWorkflow, toastr) {
  var regenerate = confirm(GLOSSARY_REGENERATE_PROMPT);

  if (!regenerate) {
    return;
  }

  if (!scope.word.morphology) {
    scope.word.etymology = [];
    return;
  }

  namesEtymologyWorkflow.prepareGlossary(scope.word.morphology, etymologyService)
    .then(function (result) {
      scope.word.morphology = result.normalizedMorphology;
      scope.word.etymology = result.etymology;
      toastr.success(GLOSSARY_FETCH_SUCCESS);
    })
    .catch(function (error) {
      toastr.error(GLOSSARY_FETCH_ERROR);
      console.error(GLOSSARY_FETCH_ERROR + ":", error);
    });

  toastr.warning(GLOSSARY_RECHECK_WARNING);
}

function definitionNeedsReview(definition) {
  return !!definition && (definition.needsReview === true || definition.NeedsReview === true);
}

function hasReviewableYorubaDefinition(definition) {
  if (!definition) {
    return false;
  }

  var content = (definition.content || "").trim();
  if (!content) {
    return false;
  }

  return !/^\{\{.*\}\}$/.test(content);
}

function getDefinitionsMarkedReviewed(word) {
  var definitions = word && Array.isArray(word.definitions) ? word.definitions : [];
  return definitions.filter(function (definition) {
    return definitionNeedsReview(definition) && hasReviewableYorubaDefinition(definition) && definition.reviewed === true;
  });
}

function getUnreviewedRequiredDefinitions(word) {
  var definitions = word && Array.isArray(word.definitions) ? word.definitions : [];
  return definitions.filter(function (definition) {
    return definitionNeedsReview(definition) && (!hasReviewableYorubaDefinition(definition) || definition.reviewed !== true);
  });
}

function finalizeReviewedDefinitions(word) {
  var definitions = word && Array.isArray(word.definitions) ? word.definitions : [];
  definitions.forEach(function (definition) {
    if (definitionNeedsReview(definition) && hasReviewableYorubaDefinition(definition) && definition.reviewed === true) {
      definition.needsReview = false;
      definition.NeedsReview = false;
    }
  });
}

function buildPublishReviewWarning(word) {
  var reviewedDefinitions = getDefinitionsMarkedReviewed(word);
  if (reviewedDefinitions.length === 0) {
    return "";
  }

  var lines = reviewedDefinitions.map(function (definition, index) {
    var yoruba = (definition.content || "(No Yoruba definition)").trim();
    var english = (definition.englishTranslation || "(No English translation)").trim();
    return index + 1 + ". Yoruba: \"" + yoruba + "\" | English: \"" + english + "\"";
  });

  return PUBLISH_REVIEW_WARNING_PREFIX + "\n\n" + lines.join("\n") + PUBLISH_REVIEW_WARNING_SUFFIX;
}

/* Controllers */
angular
  .module("NamesModule")
  .controller("NamesAddEntriesCtrl", [
    "$rootScope",
    "$scope",
    "NamesService",
    "EtymologyService",
    "NamesEtymologyWorkflow",
    "toastr",
    function ($rootScope, $scope, namesService, etymologyService, namesEtymologyWorkflow, toastr) {
      $scope.new = true;
      $scope.word = {};

      $scope.submit = function () {
        if (!Array.isArray($scope.word.etymology) || $scope.word.etymology.length === 0) {
          return namesService.addName($scope.word, function () {
            // reset the form models fields
            $scope.word = {};
          });
        }

        return submitMissingDefinitionsWithNotify($scope, etymologyService, namesEtymologyWorkflow, toastr)
          .then(function () {
            return namesService.addName($scope.word, function () {
              // reset the form models fields
              $scope.word = {};
            });
          });
      };

      $scope.publish = function () {
        console.log(
          "Each new word must go through review before getting published."
        );
      };

      $scope.generate_glossary = function () {
        generateGlossary($scope, etymologyService, namesEtymologyWorkflow, toastr);
      };
    }
  ])
  .controller("namesEditEntryCtrl", [
    "$scope",
    "$stateParams",
    "$state",
    "NamesService",
    "EtymologyService",
    "NamesEtymologyWorkflow",
    "toastr",
    "$window",
    function ($scope, $stateParams, $state, namesService, etymologyService, namesEtymologyWorkflow, toastr, $window) {
      var originalName = null;
      namesService.prevAndNextNames($stateParams.entry, function (prev, next) {
        $scope.prev = prev;
        $scope.next = next;
      });
      namesService.getName($stateParams.entry, false, function (resp) {
        $scope.word = resp;
        originalName = resp.word;
        
        // A word must have at least one definition
        if (!resp.definitions.length) {
          $scope.word.definitions.push({
            content: "",
            englishTranslation: "",
            examples: []
          });
        }
      });

      $scope.generate_glossary = function () {
        generateGlossary($scope, etymologyService, namesEtymologyWorkflow, toastr);
      };

      $scope.has_unreviewed_required_definitions = function () {
        return getUnreviewedRequiredDefinitions($scope.word).length > 0;
      };

      $scope.publish = function () {
        if ($scope.has_unreviewed_required_definitions()) {
          toastr.warning("Please review all definitions needing review before publishing.");
          return;
        }

        var publishReviewWarning = buildPublishReviewWarning($scope.word);
        if (publishReviewWarning && !$window.confirm(publishReviewWarning)) {
          return;
        }

        finalizeReviewedDefinitions($scope.word);

        // update word first, then publish
        return submitMissingDefinitionsWithNotify($scope, etymologyService, namesEtymologyWorkflow, toastr)
          .then(function () {
            return namesService.updateName(originalName, $scope.word, function () {
              // Publish the word
              return namesService
                .addNameToIndex($scope.word.word)
                .success(function () {
                  $scope.word.state = "PUBLISHED";
                  $scope.word.indexed = true;
                  toastr.info($scope.word.word + " has been published");
                  return $window.history.back();
                });
            });
          });
      };

      $scope.goto = function (entry) {
        namesService.updateName(originalName, $scope.word);
        return $state.go("auth.words.edit_entries", { entry: entry });
      };

      $scope.submit = function () {
        if ($scope.has_unreviewed_required_definitions()) {
          toastr.warning("Please review all definitions needing review before saving.");
          return;
        }

        finalizeReviewedDefinitions($scope.word);

        return submitMissingDefinitionsWithNotify($scope, etymologyService, namesEtymologyWorkflow, toastr)
          .then(function () {
            return namesService.updateName(originalName, $scope.word);
          });
      };

      $scope.delete = function () {
        if (
          $window.confirm(
            "Are you sure you want to delete " + $scope.word.word + "?"
          )
        ) {
          return namesService.deleteName($scope.word, function () {
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
    function ($scope, namesService, $stateParams, $window, toastr) {
      $scope.wordsList = [];
      $scope.status = $stateParams.status;
      $scope.count = 50;
      $scope.pagination = { current: 1 };
      $scope.sort = function (keyname) {
        $scope.sortKey = keyname;
        //set the sortKey to the param passed
        $scope.reverse = !$scope.reverse; //if true make it false and vice versa
      };
      namesService.countNames($stateParams.status, function (num) {
        $scope.wordsListItems = num;
      });
      $scope.fetch = function (newPageNumber, count) {
        return namesService
          .getNames({
            status: $stateParams.status,
            page: newPageNumber || 1,
            count: count || $scope.itemsPerPage || $scope.count || 50
          })
          .success(function (responseData) {
            $scope.wordsList = [];
            $scope.pagination.current = newPageNumber || 1;
            responseData.forEach(function (name) {
              $scope.wordsList.push(name);
            });
          });
      };
      $scope.fetch();
      $scope.delete = function (entry) {
        if (
          entry &&
          $window.confirm("Are you sure you want to delete " + entry.word + "?")
        ) {
          return namesService.deleteName(
            entry,
            function () {
              $scope.wordsList.splice($scope.wordsList.indexOf(entry), 1);
              $scope.wordsListItems--;
            },
            $scope.status
          );
        }
        var entries = $.map($scope.wordsList, function (elem) {
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
          function () {
            $scope.fetch($scope.pagination.current, $scope.itemsPerPage);
          },
          $scope.status
        );
      };
      $scope.indexName = function (entry) {
        if (entry.state === "NEW")
          return namesService.addNameToIndex(entry.word).success(function () {
            entry.state = "PUBLISHED";
            entry.indexed = true;
          });
        else if (entry.state === "MODIFIED")
          return namesService.addNameToIndex(entry.word).success(function () {
            entry.state = "PUBLISHED";
            entry.indexed = true;
          });
        // assume entry is published and objective is to unpublish it
        else
          return namesService
            .removeNameFromIndex(entry.word)
            .success(function () {
              entry.indexed = false;
              entry.state = "NEW";
            });
      };
      $scope.republishNames = function () {
        var entries = $.map($scope.wordsList, function (elem) {
          if (elem.isSelected === true) return elem;
        });
        if (!entries.length)
          return toastr.warning("No words selected to republish");
        return namesService.removeNamesFromIndex(entries).success(function () {
          return namesService.addNamesToIndex(entries).success(function () {
            $.map(entries, function (entry) {
              entry.state = "PUBLISHED";
              entry.indexed = true;
            });
            toastr.success(entries.length + " words have been republished");
          });
        });
      };
      $scope.indexNames = function (action) {
        var entries = $.map($scope.wordsList, function (elem) {
          if (elem.isSelected === true) return elem;
        });
        if (entries.length > 0) {
          if (!action || action === "add") {
            namesService
              .addNamesToIndex(entries)
              .success(function () {
                $.map(entries, function (entry) {
                  entry.indexed = true;
                  entry.state = "PUBLISHED";
                });
                toastr.success(entries.length + " words have been published");
              })
              .error(function () {
                toastr.error("Selected words could not be published");
              });
          } else {
            namesService
              .removeNamesFromIndex(entries)
              .success(function () {
                $.map(entries, function (entry) {
                  entry.indexed = false;
                  entry.state = "NEW";
                });
                toastr.success(entries.length + " words unpublished");
              })
              .error(function () {
                return toastr.error("Selected words could not be unpublished");
              });
          }
        } else {
          toastr.warning("No words selected");
        }
      };
      /**
       * Adds the suggested name to the list of words eligible to be added to search index
       */
      var acceptSuggestedName = function (entry) {
        if (!entry || !entry.id) return;
        return namesService.acceptSuggestedName(entry, function () {
          $scope.wordsList.splice($scope.wordsList.indexOf(entry), 1);
        });
      };
      // Accept Suggested Name/s
      $scope.accept = function (entry) {
        if (entry) return acceptSuggestedName(entry);
        var entries = $.map($scope.wordsList, function (elem) {
          if (elem.isSelected === true) return elem;
        });
        if (entries.length > 0) {
          return entries.forEach(function (entry) {
            acceptSuggestedName(entry);
          });
        } else toastr.warning("Please select words to accept.");
      };
    }
  ])
  .controller("namesByUserListCtrl", [
    "$scope",
    "NamesService",
    "$window",
    function ($scope, namesService, $window) {
      $scope.wordsList = [];
      namesService
        .getNames({ submittedBy: $scope.user.email })
        .success(function (responseData) {
          $scope.wordsListItems = responseData.length;
          $scope.wordsList = [];
          responseData.forEach(function (name) {
            $scope.wordsList.push(name);
          });
        });
      $scope.$on("onRepeatLast", function () {
        $("#user_list").listnav({
          filterSelector: ".ul_name",
          includeNums: false,
          removeDisabled: true,
          showCounts: false,
          onClick: function () {
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
    function ($controller, $scope, $stateParams, $localStorage) {
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
    function ($scope, namesService, $window) {
      $scope.count = 50;
      $scope.feedbacks = [];
      $scope.pagination = { current: 1 };
      $scope.sort = function (keyname) {
        $scope.sortKey = keyname;
        //set the sortKey to the param passed
        $scope.reverse = !$scope.reverse; //if true make it false and vice versa
      };
      $scope.fetch = function (newPageNumber) {
        return namesService.getRecentFeedbacks(function (responseData) {
          $scope.pagination.current = newPageNumber || 1;
          $scope.feedbacks = [];
          responseData.forEach(function (n) {
            $scope.feedbacks.push(n);
          });
        });
      };
      $scope.fetch();
      $scope.delete = function (entry) {
        // delete listed feedback entry
        if (
          entry &&
          $window.confirm(
            "Are you sure you want to delete this feedback on " +
            entry.word +
            "?"
          )
        ) {
          return namesService.deleteFeedback(entry.id, function () {
            $scope.feedbacks.splice($scope.feedbacks.indexOf(entry), 1); // $scope.count--
          });
        }
      };
      // noop function as there's no option for mass feedback delete by ids
      $scope.deleteAll = function () { };
    }
  ])
  .controller("namesDefinitionsNeedingReviewCtrl", [
    "$scope",
    "NamesService",
    function ($scope, namesService) {
      $scope.wordsList = [];
      $scope.count = 50;
      $scope.pagination = { current: 1 };
      $scope.sort = function (keyname) {
        $scope.sortKey = keyname;
        $scope.reverse = !$scope.reverse;
      };
      $scope.fetch = function (newPageNumber, count) {
        var page = newPageNumber || 1;
        var pageSize = count || $scope.count;
        return namesService
          .getDefinitionsNeedingReview(page, pageSize)
          .success(function (responseData) {
            $scope.wordsList = responseData.items || [];
            $scope.pagination.current = responseData.page || page;
            $scope.wordsListItems = responseData.totalItems || 0;
          });
      };
      $scope.fetch();
    }
  ]);
