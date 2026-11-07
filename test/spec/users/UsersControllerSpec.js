'use strict';

describe('Module: UsersModule: Controller: userListCtrl', function () {
  var $scope;
  var usersService;

  beforeEach(function () {
    angular.mock.module('UsersModule');
    angular.mock.inject(function ($rootScope, $controller) {
      $scope = $rootScope.$new();
      var users = [];
      for (var i = 0; i < 51; i++) {
        users.push({email: 'user' + i + '@example.com'});
      }
      usersService = {
        getUsers: function () {}
      };
      spyOn(usersService, 'getUsers').and.callFake(function () {
        return {
          success: function (callback) {
            callback(users);
            return this;
          }
        };
      });

      $controller('userListCtrl', {
        $scope: $scope,
        usersService: usersService,
        $window: {}
      });
    });
  });

  it('loads the full user list for client-side pagination', function () {
    expect(usersService.getUsers.calls.count()).toBe(1);
    expect(usersService.getUsers).toHaveBeenCalledWith();
    expect($scope.usersList.length).toBe(51);
    expect($scope.usersList[50].email).toBe('user50@example.com');
    expect($scope.pagination.current).toBe(1);
  });
});
