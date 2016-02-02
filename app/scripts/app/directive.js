/* Directives */

dashboardappApp

    // change page title
    .directive('updateTitle', ['$rootScope', function ($rootScope) {
        return {
            link: function (scope, element) {
                var listener = function (event, toState, toParams, fromState, fromParams) {
                    var title = 'Yoruba Names Admin';
                    if (toState.page_title) {
                        title = toState.page_title;
                    }
                    if($rootScope.appVer) {
                        element.text(title +' ('+$rootScope.appVer+')');
                    } else {
                        element.text(title);
                    }
                };
                $rootScope.$on('$stateChangeStart', listener);
            }
        }
    }])

    // page preloader
    .directive('pageLoader', [
        '$timeout',
        function ($timeout) {
            return {
                restrict: 'AE',
                template: '<div class="rect1"></div><div class="rect2"></div><div class="rect3"></div><div class="rect4"></div><div class="rect5"></div>',
                link: function (scope, el, attrs) {
                    el.addClass('pageLoader hide');
                    scope.$on('$stateChangeStart', function (event) {
                        el.toggleClass('hide animate');
                    });
                    scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
                        event.targetScope.$watch('$viewContentLoaded', function () {
                            $timeout(function () {
                                el.toggleClass('hide animate')
                            }, 600);
                        })
                    });
                }
            };
        }
    ])

    // show/hide side menu
    .directive('menuToggle', [
        '$rootScope',
        '$localStorage',
        '$window',
        '$timeout',
        function ($rootScope, $localStorage, $window, $timeout) {
            return {
                restrict: 'E',
                template: '<span class="menu_toggle" ng-click="toggleSidebar()"><span class="icon_menu_toggle" ><i class="arrow_carrot-2left" ng-class="sideNavCollapsed ? \'hide\' : \'\'"></i><i class="arrow_carrot-2right" ng-class="sideNavCollapsed ? \'\' : \'hide\'"></i></span></span>',
                link: function (scope, el, attrs) {
                    var mobileView = 992;
                    $rootScope.getWidth = function () {
                        return window.innerWidth;
                    };
                    $rootScope.$watch($rootScope.getWidth, function (newValue, oldValue) {
                        if (newValue >= mobileView) {
                            if (angular.isDefined($localStorage.sideNavCollapsed)) {
                                if($localStorage.sideNavCollapsed == false) {
                                    $rootScope.sideNavCollapsed = false;
                                } else {
                                    $rootScope.sideNavCollapsed = true;
                                }
                            } else {
                                $rootScope.sideNavCollapsed = false;
                            }
                        } else {
                            $rootScope.sideNavCollapsed = true;
                        }
                        $timeout(function() {
                            $(window).resize();
                        });
                    });
                    scope.toggleSidebar = function () {
                        $rootScope.sideNavCollapsed = !$rootScope.sideNavCollapsed;
                        $localStorage.sideNavCollapsed = $rootScope.sideNavCollapsed;
                        if(!$rootScope.fixedLayout) {
                            if(window.innerWidth > 991) {
                                $timeout(function () {
                                    $(window).resize();
                                });
                            }
                        }
                        if(!$rootScope.sideNavCollapsed && !$rootScope.topMenuAct) {
                            $rootScope.createScrollbar();
                        } else {
                            $rootScope.destroyScrollbar();
                        }
                    };
                }
            };
        }
    ])

    // update datatables fixedHeader position
    .directive('updateFixedHeaders', ['$window', function ($window) {
        return function (scope, element) {
            var w = angular.element($window);
            scope.getElDimensions = function () {
                return {
                    'w': element.width(),
                    'h': element.height()
                }
            }
            scope.$watch(scope.getElDimensions, function (newValue, oldValue) {
                if(typeof oFH != 'undefined') {
                    oFH._fnUpdateClones( true )
                    oFH._fnUpdatePositions()
                }
            }, true)
            w.bind('resize', function () {
                scope.$apply()
            })
        }
    }])

    // ng-repeat after render callback
    .directive('onLastRepeat', ['$timeout', function ($timeout) {
        return function (scope, element, attrs) {

            if (!scope.$last) return false;

            /*var footableTable = element.parents('table')

            if ( footableTable.length ) 
                
            scope.$evalAsync(function(){
                if (! footableTable.hasClass('footable-loaded')) {
                    footableTable.footable()
                }
                footableTable.trigger('footable_initialized')
                footableTable.trigger('footable_resize')
                footableTable.data('footable').redraw()
            })*/

            if (scope.$last) {
                $timeout(function () {
                    scope.$emit('onRepeatLast', element, attrs)
                })
            }
        }
    }])

    // add width/height properities to Image
    .directive('addImageProp', function () {
        return {
            restrict: 'A',
            link: function (scope, elem, attr) {
                elem.on('load', function () {
                    var w = !scope.isHighDensity() ? $(this).width() : $(this).width()/2,
                        h = !scope.isHighDensity() ? $(this).height() : $(this).height()/2;
                    $(this).attr('width',w).attr('height',h)
                })
            }
        }
    })

    // 
    .directive('geolocation', ['namesApi', function(api) {
        return {
            link: function(scope, element, attrs) {
              api.getGeoLocations().success(function(resp) {
                scope.geoLocations = resp
              })
              
              scope.queryGeolocation = function(query){
                return scope.geoLocations
              }
            }
        }
    }])

    .directive('etymology', ['$stateParams', function($stateParams) {
        return {
            replace: true,
            restrict:'E',
            templateUrl: 'tmpls/names/directives/etymology.html',
            link: function(scope, element, attrs) {

              if (!$stateParams.entry) {
                scope.name.etymology = []
                scope.name.etymology.push({ part:'', meaning:'' })
              }
              
              scope.add_etymology = function() {
                return scope.name.etymology.push({ part:'', meaning:'' })
              }

              scope.remove_etymology = function(index) {
                scope.name.etymology.splice(index, 1)
                if ( scope.name.etymology.length < 1 )
                return scope.name.etymology.push({ part:'', meaning:'' })
              }

              scope.$watch('name.etymology', function(val) {
                scope.form.$dirty = true;
              }, true)

            }
        }
    }])

    .directive('avatar', ['$localStorage', function($localStorage) {
        return {
            restrict:'E',
            template: '<div class="user_avatar"></div>',
            link: function(scope, element, attrs) {
              var user = attrs.ngModel ? scope.$eval(attrs.ngModel) : $localStorage.user,
                  name = user.username || user.email,
                  letter = name.substr(0,1).toUpperCase(),
                  div = attrs.size == 'large' ? 
                    $('<div style="width:80px; height:80px; color:#333; background:#c0c0c0; line-height:2; font-size:40px; display:inline-block; float:left; text-align:center; margin-right:15px;">' + letter + '</div>')
                    :
                    $('<div style="width:38px; height:auto; color:#fff; font-size:28px; float:left; display:inline-block; text-align:center;">' + letter + '</div>')
              element.html( div )
            }
        }
    }])

    /* Courtesy: Chris Tesene 
       http://christesene.com/angular-js-directive-to-allow-a-select-all-checkbox-also-provide-all-checked-and-none-checked-if-needed/
     */

    .directive('selectAllCheckbox', function () {
        return {
            replace: true,
            restrict: 'E',
            scope: {
                checkboxes: '='
            },
            template: '<input type="checkbox" ng-model="master" ng-change="masterChange()">',
            controller: function ($scope, $element) {

                $scope.masterChange = function () {
                    if ($scope.master) {
                        angular.forEach($scope.checkboxes, function (cb, index) {
                            cb.isSelected = true;
                        })
                    } else {
                        angular.forEach($scope.checkboxes, function (cb, index) {
                            cb.isSelected = false;
                        })
                    }
                }

                $scope.$watch('checkboxes', function () {
                    var allSet = true,
                        allClear = true;
                    angular.forEach($scope.checkboxes, function (cb, index) {
                        if (cb.isSelected) {
                            allClear = false;
                        } else {
                            allSet = false;
                        }
                    })

                    if ($scope.allselected !== undefined) {
                        $scope.allselected = allSet;
                    }
                    if ($scope.allclear !== undefined) {
                        $scope.allclear = allClear;
                    }

                    $element.prop('indeterminate', false);
                    if (allSet) {
                        $scope.master = true;
                    } else if (allClear) {
                        $scope.master = false;
                    } else {
                        $scope.master = false;
                        $element.prop('indeterminate', true)
                    }

                }, true)
            }
        }
    })

    .directive('feedback', ['namesApi', '$modal', '$timeout', '$rootScope',  function(api, $modal, $timeout, $rootScope){
        return {
            //replace: true,
            restrict: 'EA',
            templateUrl: 'tmpls/names/feedbacks.html',
            link: function (scope, element, attributes) {
              $timeout(function(){
                api.getFeedback(attributes['name'], function (resp) {
                    scope.feedbacks = resp
                })
              }, 500)
              scope.showFeedbacks = function () {
                $modal.open({
                    templateUrl: 'tmpls/names/partials/feedbackModal.html',
                    size: 'md',
                    controller: function ($scope, $modalInstance) {
                        $scope.modalTitle = 'Feedbacks on ' + attributes['name']
                        $scope.feedbacks = scope.feedbacks
                        $scope.isAdmin = $rootScope.isAdmin
                        // delete all feedbacks and closes modal
                        $scope.deleteFeedbacks = function () {
                            api.deleteFeedbacks(attributes['name'], function () {
                              $modalInstance.close()
                            })
                        }
                        // delete one feedback by id and remove from list
                        $scope.deleteFeedback = function (feedback) {
                            api.deleteFeedback(feedback, function () {
                              $scope.feedbacks.splice( $scope.feedbacks.indexOf(feedback), 1)
                            })
                        }
                        $scope.cancel = function () {
                            $modalInstance.dismiss('cancel')
                        }
                    }
                }) 
              }

            }
        }
    }])

    .directive('keyboard', function(){
        return {
            replace: true,
            restrict: 'EA',
            link: function(scope, element, attributes){
              element.keyboard({
                layout: 'custom',
                customLayout: {
                    'normal': [
                        'à á è é ẹ̀ ẹ ẹ́ ì í',
                        'ò ó ọ̀ ọ ọ́ ṣ ù ú',
                    ],
                    'shift': [
                        'Ň W Ĕ R T Ž Ú Å S D Í Ò',
                        'Ý J Ŵ P Ț X Ç V Õ',
                    ]
                },
                autoAccept   : true,
                autoAcceptOnEsc : true,
                appendTo: 'body',
                usePreview   : false,
              })
            }
        }
    })

;