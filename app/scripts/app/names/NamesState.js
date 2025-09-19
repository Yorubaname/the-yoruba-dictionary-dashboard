"use strict";

/* States */
angular.module("NamesModule").config([
  "$stateProvider",
  function($stateProvider) {
    // State Configurations
    $stateProvider
      // Names (parent state)
      .state("auth.names", {
        abstract: true,
        url: "/names",
        template:
          '<div ui-view autoscroll="false" class="mainView-animate"></div>',
        data: {
          requiresBasicPriviledge: true
        }
      })
      // Words > New Entries
      .state("auth.names.add_entries", {
        page_title: "Yoruba Words - Admin - Add Word Entries",
        ncyBreadcrumb: { label: "Add Word Entries" },
        url: "/new",
        templateUrl: "tmpls/names/new.html",
        controller: "NamesAddEntriesCtrl"
      })
      // Edit Word Entry
      .state("auth.names.edit_entries", {
        page_title: "Yoruba Words - Admin - Edit Entry",
        ncyBreadcrumb: { label: "Edit Entry" },
        url: "/edit/:entry",
        templateUrl: "tmpls/names/edit.html",
        controller: "namesEditEntryCtrl"
      })
      // Words > Published Words
      .state("auth.names.list_entries", {
        page_title: "Yoruba Words - Admin - Words",
        ncyBreadcrumb: { label: "Words Entries" },
        url: "/lists/:status?:submmittedBy",
        templateUrl: "tmpls/names/lists.html",
        controller: "namesListEntriesCtrl"
      })
      // Words > Word Search
      .state("auth.names.search", {
        page_title: "Yoruba Words - Admin - Word Search",
        ncyBreadcrumb: { label: "Search" },
        url: "/search/:entry",
        templateUrl: "tmpls/names/search.html",
        controller: "nameSearchCtrl"
      })
      // All Words Feedback
      .state("auth.names.feedbacks", {
        page_title: "Yoruba Words - Admin - Feedbacks",
        ncyBreadcrumb: { label: "Word Feedbacks" },
        url: "/feedbacks",
        templateUrl: "tmpls/names/feedbacks-list.html",
        controller: "namesFeedbacksCtrl"
      });
  }
]);
