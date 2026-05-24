"use strict";

/* Directives */
angular
  .module("NamesModule") // Directive adds the geolocation autocompletes on the tagsInput field of Name Form
  .directive("nameForm", [
    "geolocationService",
    function (geo) {
      return {
        link: function (scope) {
          geo.load().then(function (data) {
            scope.geolocations = data;
          });

          scope.query = function (query) {
            if (!scope.geolocations) return [];

            if (!query || query.trim() === '') {
              // If the query is empty or null, return the full list
              return scope.geolocations;
            }

            // Otherwise, filter the list based on the query
            return scope.geolocations.filter(function (location) {
              return location.place.toLowerCase().indexOf(query.toLowerCase()) !== -1;
            });
          };
        }
      };
    }
  ]) // Directive adds File Uploader widget on the New Name Form for uploading names in bulk
  .directive("namesUpload", [
    "uploadService",
    function (Uploader) {
      return {
        controller: function ($scope) {
          $scope.uploader = Uploader({
            url: "/v1/names/upload",
            alias: "nameFiles",
            fileType: [
              "text/csv",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ]
          });
        }
      };
    }
  ]) // Directive adds array of Etymology fields to the Name Form
  .directive("etymology", [
    "$stateParams",
    "EtymologyService",
    "toastr",
    function ($stateParams, etymologyService, toastr) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/words/directives/etymology.html",
        link: function (scope) {
          var hasWordModel = function () {
            return !!scope.word;
          };

          var ensureEtymologyArray = function () {
            if (!hasWordModel()) {
              return false;
            }

            if (!Array.isArray(scope.word.etymology)) {
              scope.word.etymology = [];
            }

            return true;
          };

          var normalizePart = function (part) {
            return (part || "").toLowerCase().normalize("NFC").trim();
          };

          var findDuplicateIndex = function (part, currentIndex) {
            if (!ensureEtymologyArray() || !part) {
              return -1;
            }

            for (var i = 0; i < scope.word.etymology.length; i++) {
              if (i === currentIndex) {
                continue;
              }

              if (normalizePart(scope.word.etymology[i] && scope.word.etymology[i].part) === part) {
                return i;
              }
            }

            return -1;
          };

          var ensureDefinitionState = function (item) {
            if (!Array.isArray(item.definitions)) {
              item.definitions = [];
            }

            if (typeof item.selectedDefinitionIndex !== "number") {
              item.selectedDefinitionIndex = item.definitions.indexOf(item.meaning);
            }

            if (item.selectedDefinitionIndex < 0 || item.selectedDefinitionIndex >= item.definitions.length) {
              item.selectedDefinitionIndex = -1;
            }
          };

          var applyFetchedDefinitions = function (item, definitions) {
            var normalizedDefinitions = Array.isArray(definitions) ? definitions : [];
            item.definitions = normalizedDefinitions;
            item.selectedDefinitionIndex = normalizedDefinitions.length > 0 ? 0 : -1;

            if (normalizedDefinitions.length > 0) {
              item.meaning = normalizedDefinitions[0];
            }
          };

          if (!$stateParams.entry) {
            scope.word.etymology = [];
          }

          scope.add_etymology = function () {
            if (!ensureEtymologyArray()) {
              return;
            }

            return scope.word.etymology.push({
              part: "",
              meaning: "",
              definitions: [],
              selectedDefinitionIndex: -1,
              isFresh: true
            });
          };

          scope.fetch_definitions = function (etymology) {
            if (!etymology || !etymology.isFresh) {
              return;
            }

            var currentIndex = ensureEtymologyArray() ? scope.word.etymology.indexOf(etymology) : -1;

            var normalizedPart = normalizePart(etymology.part);
            if (!normalizedPart) {
              etymology.definitions = [];
              etymology.selectedDefinitionIndex = -1;
              etymology.meaning = "";
              return;
            }

            if (findDuplicateIndex(normalizedPart, currentIndex) >= 0) {
              if (currentIndex >= 0) {
                scope.word.etymology.splice(currentIndex, 1);
              }
              toastr.warning("Duplicate etymology part \"" + normalizedPart + "\" was removed.");
              return;
            }

            etymology.part = normalizedPart;

            etymologyService.getMeanings([normalizedPart])
              .then(function (data) {
                var definitions = data && (data[normalizedPart] || data[etymology.part]) || [];
                applyFetchedDefinitions(etymology, definitions);
              })
              .catch(function () {
                toastr.error("Could not fetch English definitions for this etymology part.");
              });
          };

          scope.can_cycle = function (index) {
            var item = scope.word.etymology[index];
            if (!item) {
              return false;
            }

            ensureDefinitionState(item);
            return item.definitions.length > 1;
          };

          scope.cycle_meaning = function (index) {
            var item = scope.word.etymology[index];
            if (!item) {
              return;
            }

            ensureDefinitionState(item);
            if (item.definitions.length <= 1) {
              return;
            }

            item.selectedDefinitionIndex = (item.selectedDefinitionIndex + 1) % item.definitions.length;
            item.meaning = item.definitions[item.selectedDefinitionIndex];
          };

          scope.definition_position = function (index) {
            var item = scope.word.etymology[index];
            if (!item) {
              return 0;
            }

            ensureDefinitionState(item);
            return item.selectedDefinitionIndex >= 0 ? item.selectedDefinitionIndex + 1 : 0;
          };

          scope.definition_total = function (index) {
            var item = scope.word.etymology[index];
            if (!item) {
              return 0;
            }

            ensureDefinitionState(item);
            return item.definitions.length;
          };

          scope.remove_etymology = function (index) {
            if (!ensureEtymologyArray()) {
              return;
            }

            scope.word.etymology.splice(index, 1);
          };

          scope.$watch(
            "word.etymology",
            function () {
              if (!ensureEtymologyArray()) {
                return;
              }

              if (Array.isArray(scope.word.etymology)) {
                scope.word.etymology.forEach(ensureDefinitionState);
              }

              scope.form.$dirty = true;
            },
            true
          );
        }
      };
    }
  ]) // Directive adds array of definition fields to the word Form
  .directive("definition", [
    "$stateParams",
    function ($stateParams) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/words/directives/definition.html",
        link: function (scope) {
          var ensureDefinitionsArray = function () {
            if (!scope.word) {
              return false;
            }

            if (!Array.isArray(scope.word.definitions)) {
              scope.word.definitions = [];
            }

            return true;
          };

          var definitionNeedsReview = function (definition) {
            return !!definition && (definition.needsReview === true || definition.NeedsReview === true);
          };

          var hasReviewableYorubaDefinition = function (definition) {
            if (!definition) {
              return false;
            }

            var content = (definition.content || "").trim();
            if (!content) {
              return false;
            }

            // Placeholder template values are treated as not-yet-populated content.
            return !/^\{\{.*\}\}$/.test(content);
          };

          var ensureReviewState = function (definition) {
            if (!definition) {
              return;
            }

            if (definitionNeedsReview(definition)) {
              if (!hasReviewableYorubaDefinition(definition)) {
                definition.reviewed = false;
              } else if (definition.reviewed !== true) {
                definition.reviewed = false;
              }
            } else {
              definition.reviewed = true;
            }
          };

          if (!$stateParams.entry) {
            scope.word.definitions = [
              {
                content: "",
                englishTranslation: "",
                examples: [],
                reviewed: true
              }
            ];
          }

          scope.is_review_required = function (definition) {
            return definitionNeedsReview(definition);
          };

          scope.can_mark_reviewed = function (definition) {
            return definitionNeedsReview(definition) && hasReviewableYorubaDefinition(definition);
          };

          scope.add_definition = function () {
            if (!ensureDefinitionsArray()) {
              return;
            }

            return scope.word.definitions.push({
              content: "",
              englishTranslation: "",
              examples: [],
              reviewed: true
            });
          };

          scope.remove_definition = function (index) {
            if (!ensureDefinitionsArray()) {
              return;
            }

            scope.word.definitions.splice(index, 1);
            if (scope.word.definitions.length < 1)
              return scope.word.definitions.push({
                content: "",
                englishTranslation: "",
                examples: [],
                reviewed: true
              });
          };

          scope.add_example = function (definition) {
            definition.examples = definition.examples || [];
            return definition.examples.push({
              content: "",
              englishTranslation: "",
              type: ""
            });
          };

          scope.remove_example = function (definition, index) {
            definition.examples = definition.examples || [];
            return definition.examples.splice(index, 1);
          };

          scope.$watch(
            "word.definitions",
            function () {
              if (!ensureDefinitionsArray()) {
                return;
              }

              if (Array.isArray(scope.word.definitions)) {
                scope.word.definitions.forEach(ensureReviewState);
              }

              if (scope.form) {
                scope.form.$dirty = true;
              }
            },
            true
          );
        }
      };
    }
  ])
  .directive("multimedia", [
    "$stateParams",
    function ($stateParams) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/words/directives/multimedia.html",
        link: function (scope) {
          if (!$stateParams.entry) {
            scope.word.mediaLinks = [];
          }

          scope.add_media = function () {
            return scope.word.mediaLinks.push({
              link: "",
              caption: "",
              type: ""
            });
          };

          scope.remove_media = function (index) {
            scope.word.mediaLinks.splice(index, 1);
          };

          scope.$watch(
            "word.mediaLinks",
            function () {
              scope.form.$dirty = true;
            },
            true
          );
        }
      };
    }
  ])
  .directive("variants", [
    "$stateParams",
    "geolocationService",
    function ($stateParams, geolocationService) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/words/directives/variants.html",
        link: function (scope) {
          geolocationService.load().then(function (geolocation) {
            scope.geolocationList = geolocation;
          });

          if (!$stateParams.entry) {
            scope.word.variants = [];
          }

          scope.updateGeolocation = function (variant) {
            var selectedGeo = scope.geolocationList.find(function (geo) {
              return geo.place === variant.geolocation.place;
            });
            if (selectedGeo) {
              variant.geolocation.region = selectedGeo.region;
            }
          };

          scope.add_variant = function () {
            return scope.word.variants.push({
              word: "",
              geolocation: {
                place: "",
                region: ""
              }
            });
          };

          scope.remove_variant = function (index) {
            scope.word.variants.splice(index, 1);
          };

          scope.$watch(
            "word.variants",
            function () {
              scope.form.$dirty = true;
            },
            true
          );
        }
      };
    }
  ])
  .directive("feedback", [
    "NamesService",
    "$modal",
    "$stateParams",
    "$rootScope",
    function (api, $modal, $stateParams, $rootScope) {
      return {
        //replace: true,
        restrict: "EA",
        templateUrl: "tmpls/words/feedbacks.html",
        link: function (scope, element, attributes) {
          api.getFeedback($stateParams.entry, function (resp) {
            scope.feedbacks = resp;
          });
          scope.showFeedbacks = function () {
            $modal.open({
              templateUrl: "tmpls/words/partials/feedbackModal.html",
              size: "md",
              controller: function ($scope, $modalInstance) {
                $scope.modalTitle = "Feedbacks on " + attributes.word;
                $scope.feedbacks = scope.feedbacks;
                $scope.isAdmin = $rootScope.isAdmin;
                // delete all feedbacks and closes modal
                $scope.deleteFeedbacks = function () {
                  api.deleteFeedbacks(attributes.word, function () {
                    $scope.feedbacks.splice(0, $scope.feedbacks.length);
                    $modalInstance.close();
                  });
                };
                // delete one feedback by id and remove from list
                $scope.deleteFeedback = function (feedback) {
                  api.deleteFeedback(feedback.id, feedback.word, function () {
                    $scope.feedbacks.splice($scope.feedbacks.indexOf(feedback), 1);
                    if (!$scope.feedbacks.length) {
                      $modalInstance.close();
                    }
                  });
                };
                $scope.cancel = function () {
                  $modalInstance.dismiss("cancel");
                };
              }
            });
          };
        }
      };
    }
  ]);
