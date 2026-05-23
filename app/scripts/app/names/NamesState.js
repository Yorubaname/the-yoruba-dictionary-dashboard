"use strict";

/* States */
angular.module("NamesModule").config([
  "$stateProvider",
  function ($stateProvider) {
    // State Configurations
    $stateProvider
      // Words (parent state)
      .state("auth.words", {
        abstract: true,
        url: "/words",
        template:
          '<div ui-view autoscroll="false" class="mainView-animate"></div>',
        data: {
          requiresBasicPriviledge: true
        }
      })
      // Words > New Entries
      .state("auth.words.add_entries", {
        page_title: "Yoruba Words - Admin - Add Word Entries",
        ncyBreadcrumb: { label: "Add Word Entries" },
        url: "/new",
        templateUrl: "tmpls/words/new.html",
        controller: "NamesAddEntriesCtrl"
      })
      // Edit Word Entry
      .state("auth.words.edit_entries", {
        page_title: "Yoruba Words - Admin - Edit Entry",
        ncyBreadcrumb: { label: "Edit Entry" },
        url: "/edit/:entry",
        templateUrl: "tmpls/words/edit.html",
        controller: "namesEditEntryCtrl"
      })
      // Words > Published Words
      .state("auth.words.list_entries", {
        page_title: "Yoruba Words - Admin - Words",
        ncyBreadcrumb: { label: "Words Entries" },
        url: "/lists/:status?:submmittedBy",
        templateUrl: "tmpls/words/lists.html",
        controller: "namesListEntriesCtrl"
      })
      // Words > Word Search
      .state("auth.words.search", {
        page_title: "Yoruba Words - Admin - Word Search",
        ncyBreadcrumb: { label: "Search" },
        url: "/search/:entry",
        templateUrl: "tmpls/words/search.html",
        controller: "nameSearchCtrl"
      })
      // All Words Feedback
      .state("auth.words.feedbacks", {
        page_title: "Yoruba Words - Admin - Feedbacks",
        ncyBreadcrumb: { label: "Word Feedbacks" },
        url: "/feedbacks",
        templateUrl: "tmpls/words/feedbacks-list.html",
        controller: "namesFeedbacksCtrl"
      })
      // Words > With New Definitions
      .state("auth.words.definitions_needs_review", {
        page_title: "Yoruba Words - Admin - With New Definitions",
        ncyBreadcrumb: { label: "With New Definitions" },
        url: "/definitions/needs-review",
        templateUrl: "tmpls/words/definitions-needs-review.html",
        controller: "namesDefinitionsNeedingReviewCtrl"
      });
  }
]);
