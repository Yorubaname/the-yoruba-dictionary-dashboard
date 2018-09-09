"use strict";

/* Directives */
angular
  .module("NamesModule") // Directive adds the geolocation autocompletes on the tagsInput field of Name Form
  .directive("nameForm", [
    "geolocationService",
    function(geo) {
      return {
        link: function(scope) {
          scope.query = function() {
            return geo.load();
          };
        }
      };
    }
  ]) // Directive adds File Uploader widget on the New Name Form for uploading names in bulk
  .directive("namesUpload", [
    "uploadService",
    function(Uploader) {
      return {
        controller: function($scope) {
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
    function($stateParams) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/names/directives/etymology.html",
        link: function(scope) {
          if (!$stateParams.entry) {
            scope.word.etymology = [];
            scope.word.etymology.push({
              part: "",
              meaning: ""
            });
          }

          scope.add_etymology = function() {
            return scope.word.etymology.push({
              part: "",
              meaning: ""
            });
          };

          scope.remove_etymology = function(index) {
            scope.word.etymology.splice(index, 1);
            if (scope.word.etymology.length < 1)
              return scope.word.etymology.push({
                part: "",
                meaning: ""
              });
          };
          scope.$watch(
            "name.etymology",
            function() {
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
    function($stateParams) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/names/directives/definition.html",
        link: function(scope) {
          if (!$stateParams.entry) {
            scope.word.definitions = [
              {
                content: "",
                englishTranslation: "",
                examples: []
              }
            ];
          }

          scope.add_definition = function() {
            return scope.word.definitions.push({
              content: "",
              englishTranslation: "",
              examples: []
            });
          };

          scope.remove_definition = function(index) {
            scope.word.definitions.splice(index, 1);
            if (scope.word.definitions.length < 1)
              return scope.word.definitions.push({
                content: "",
                englishTranslation: "",
                examples: []
              });
          };

          scope.add_example = function(definition) {
            return definition.examples.push({
              content: "",
              englishTranslation: "",
              type: ""
            });
          };

          scope.remove_example = function(definition, index) {
            return definition.examples.splice(index, 1);
          };

          scope.$watch(
            "word.definitions",
            function() {
              scope.form.$dirty = true;
            },
            true
          );
        }
      };
    }
  ])
  .directive("multimedia", [
    "$stateParams",
    function($stateParams) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/names/directives/multimedia.html",
        link: function(scope) {
          if (!$stateParams.entry) {
            scope.word.mediaLinks = [];
          }

          scope.add_media = function() {
            return scope.word.mediaLinks.push({
              link: "",
              caption: "",
              type: ""
            });
          };

          scope.remove_media = function(index) {
            scope.word.mediaLinks.splice(index, 1);
          };

          scope.$watch(
            "word.mediaLinks",
            function() {
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
    function($stateParams, geolocationService) {
      return {
        replace: true,
        restrict: "E",
        templateUrl: "tmpls/names/directives/variants.html",
        link: function(scope) {
          geolocationService.load().then(function(geolocation) {
            scope.geolocationList = geolocation.data;
          });

          if (!$stateParams.entry) {
            scope.word.variants = [];
          }

          scope.add_variant = function() {
            return scope.word.variants.push({
              name: ""
            });
          };

          scope.remove_variant = function(index) {
            scope.word.variants.splice(index, 1);
          };

          scope.$watch(
            "word.variants",
            function() {
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
    function(api, $modal, $stateParams, $rootScope) {
      return {
        //replace: true,
        restrict: "EA",
        templateUrl: "tmpls/names/feedbacks.html",
        link: function(scope, element, attributes) {
          api.getFeedback($stateParams.entry, function(resp) {
            scope.feedbacks = resp;
          });
          scope.showFeedbacks = function() {
            $modal.open({
              templateUrl: "tmpls/names/partials/feedbackModal.html",
              size: "md",
              controller: function($scope, $modalInstance) {
                $scope.modalTitle = "Feedbacks on " + attributes.word;
                $scope.feedbacks = scope.feedbacks;
                $scope.isAdmin = $rootScope.isAdmin;
                // delete all feedbacks and closes modal
                $scope.deleteFeedbacks = function() {
                  api.deleteFeedbacks(attributes.word, function() {
                    $modalInstance.close();
                  });
                };
                // delete one feedback by id and remove from list
                $scope.deleteFeedback = function(feedback) {
                  api.deleteFeedback(feedback.id, function() {
                    $scope.feedbacks.splice(
                      $scope.feedbacks.indexOf(feedback),
                      1
                    );
                  });
                };
                $scope.cancel = function() {
                  $modalInstance.dismiss("cancel");
                };
              }
            });
          };
        }
      };
    }
  ]);
