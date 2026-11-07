'use strict';

/* Controllers */
angular.module('UsersModule').controller('userListCtrl', [
  '$scope',
  'usersService',
  '$window',
  function ($scope, api, $window) {
    $scope.usersList = [];
    $scope.pagination = { current: 1 };
    $scope.sort = function (keyname) {
      $scope.sortKey = keyname;
      //set the sortKey to the param passed
      $scope.reverse = !$scope.reverse;  //if true make it false and vice versa
    };
    $scope.fetch = function () {
      return api.getUsers().success(function (response) {
        $scope.usersList = [];
        response.forEach(function (user) {
          $scope.usersList.push(user);
        });
      });
    };
    $scope.delete = function (user) {
      if (!$window.confirm('Are you sure you want to delete this account?'))
        return;
      return api.deleteUser(user, function () {
        // remove from list
        $scope.usersList.splice($scope.usersList.indexOf(user), 1);
        $scope.usersListItems--;
      });
    };
    $scope.fetch();
  }
])  /*

    .controller('profileIndexCtrl', [
        '$scope',
        '$localStorage',
        'usersService',
        function ($scope, $localStorage, api) {
            api.getUser($localStorage.id).success(function(user){
                $scope.user = user
            }).error(function(resp){
                console.log(resp)
            })
        }
    ]) */;