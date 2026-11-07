'use strict';

describe('Module: UsersModule: Controller: userListCtrl', function () {
  var $scope;
  var usersService;

  beforeEach(function () {
    angular.mock.module('UsersModule');
    angular.mock.inject(function ($rootScope, $controller) {
      $scope = $rootScope.$new();
      usersService = {
        countUsers: function (callback) {
          callback(1);
        },
        getUsers: function () {}
      };
      spyOn(usersService, 'getUsers').and.callFake(function () {
        return {
          success: function (callback) {
            callback([{email: 'user@example.com'}]);
            return this;
          }
        };
      });

      $controller('userListCtrl', {
        $scope: $scope,
        usersService: usersService,
        $window: {},
        $stateParams: {role: 'all'}
      });
    });
  });

  it('requests users for the selected role and page', function () {
    expect(usersService.getUsers).toHaveBeenCalledWith({
      role: 'all',
      page: 1,
      count: 50
    });
    expect($scope.usersList.length).toBe(1);

    $scope.fetch(2);

    expect(usersService.getUsers).toHaveBeenCalledWith({
      role: 'all',
      page: 2,
      count: 50
    });
    expect($scope.pagination.current).toBe(2);
  });
});
