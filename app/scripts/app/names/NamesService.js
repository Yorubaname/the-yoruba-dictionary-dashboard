"use strict";

/* Names API Endpoint Service, Extension for API requests for Name Entries resources only. Adapted from code base */
angular.module("NamesModule").service("NamesService", [
  "baseService",
  "toastr",
  "$state",
  "$localStorage",
  "$timeout",
  "_",
  function(api, toastr, $state, $localStorage, $timeout, _) {
    var cacheNames = function() {
      return api.get("/v1/words?all=true").success(function(resp) {
        $localStorage.entries = resp;
      });
    };

    // TODO turn to a component
    var isEmptyObj = function(obj) {
      // null and undefined are "empty"
      if (obj === null) {
        return true;
      }
      // Assume if it has a length property with a non-zero value
      // that that property is correct.
      if (obj.length > 0) {
        return false;
      }
      if (obj.length === 0) {
        return true;
      }
      // Otherwise, does it have any properties of its own?
      // Note that this doesn't handle
      // toString and valueOf enumeration bugs in IE < 9
      for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          return false;
        }
      }
      return true;
    };

    /**
     * Adds a name to the database;
     * @param nameEntry
     */
    this.addName = function(word, fn) {
      // include logged in user's details, only if none exist - applies to accepting suggested names
      if (!word.submittedBy) word.submittedBy = $localStorage.username;
      return api
        .postJson("/v1/words", word)
        .success(function() {
          toastr.success(
            word.word + " was successfully added. Add another name"
          );
          fn();
          cacheNames();
        })
        .error(function(error) {
          toastr.error(word.word + " could not be added: " + error.message);
        });
    };
    var getPrevAndNextNames = function(word, fn) {
      var index = _.findIndex($localStorage.entries, { word: word }),
        prev = $localStorage.entries[index - 1],
        next = $localStorage.entries[index + 1];
      return fn(prev, next);
    };
    this.prevAndNextNames = function(word, fn) {
      if ($localStorage.entries && $localStorage.entries.length)
        return getPrevAndNextNames(word, fn);
      else {
        return api.get("/v1/words").success(function(resp) {
          $localStorage.entries = resp;
          return getPrevAndNextNames(word, fn);
        });
      }
    };
    this.getCachedNames = function(fn) {
      if ($localStorage.entries && $localStorage.entries.length)
        return fn($localStorage.entries);
      else
        return api.get("/v1/words?all=true").success(function(resp) {
          $localStorage.entries = resp;
          return fn($localStorage.entries);
        });
    };
    this.search = function(name) {
      return api.get("/v1/search", { q: name });
    };
    /**
     * Updates an existing name in the database;
     * @param nameEntry
     */
    this.updateName = function(originalName, wordEntry, fn) {
      wordEntry = angular.copy(wordEntry);
      return api
        .putJson("/v1/words/" + originalName, wordEntry)
        .success(function(resp) {
          toastr.success(wordEntry.word + " was successfully updated.");
          cacheNames();
          if (fn) return fn(resp);
        })
        .error(function() {
          toastr.error(
            wordEntry.word + " could not be updated. Please try again."
          );
        });
    };
    /**
     * Deletes a name from the database;
     * @param nameEntry
     */
    this.deleteName = function(entry, fn, status) {
      if (status === "suggested")
        return api
          .delete("/v1/suggestions/" + entry.id)
          .success(function() {
            toastr.success(
              entry.word +
                " with id: " +
                entry.id +
                " has been deleted successfully"
            );
            return fn();
          })
          .error(function() {
            toastr.error(
              entry.word +
                " with id: " +
                entry.id +
                " could not be deleted. Please try again."
            );
          });
      return api
        .deleteJson("/v1/words/" + entry.word, entry)
        .success(function() {
          toastr.success(entry.word + " has been deleted successfully");
          cacheNames();
          fn();
        })
        .error(function() {
          toastr.error(entry.word + " could not be deleted. Please try again.");
        });
    };
    this.deleteNames = function(words, fn, status) {
      words = _.pluck(words, "word");
      if (status === "suggested")
        return api
          .deleteJson("/v1/suggestions/batch", words)
          .success(function() {
            toastr.success(words.length + " suggested words have been deleted");
            return fn();
          })
          .error(function() {
            toastr.error("Could not delete selected words. Please try again.");
          });
      return api
        .deleteJson("/v1/words/batch", words)
        .success(function() {
          toastr.success(
            words.length + " words have been deleted successfully"
          );
          cacheNames();
          return fn();
        })
        .error(function() {
          toastr.error("Could not delete selected words. Please try again.");
        });
    };
    /**
     * Get a name
     * returns the one or zero result
     */
    this.getName = function(name, duplicate, fn) {
      return api
        .get("/v1/words/" + name, { duplicates: duplicate })
        .success(function(resp) {
          return fn(resp);
        });
    };
    this.getNames = function(filter) {
      filter = !isEmptyObj(filter) ? filter : {};
      filter.page = filter.page || 1;
      filter.count = filter.count || 50;
      filter.orderBy = "createdAt";
      if (filter.status === "suggested") return api.get("/v1/suggestions");
      else if (filter.status === "published") filter.state = "PUBLISHED";
      else if (filter.status === "unpublished") filter.state = "NEW";
      else if (filter.status === "modified") filter.state = "MODIFIED";
      return api.get("/v1/words", filter);
    };
    this.countNames = function(status, fn) {
      var endpoint = "/v1/words/meta";
      if (status === "published") endpoint = "/v1/search/meta";
      if (status === "suggested") endpoint = "/v1/suggestions/meta";
      return api.get(endpoint, { count: true }).success(function(resp) {
        if (status === "modified") return fn(resp.totalModifiedNames);
        else if (status === "published") return fn(resp.totalPublishedNames);
        else if (status === "unpublished") return fn(resp.totalNewNames);
        else if (status === "suggested") return fn(resp.totalSuggestedNames);
        else if (status === "all") return fn(resp.totalNames);
        else return fn(resp);
      });
    };
    this.getRecentlyIndexedNames = function(fn) {
      return api.get("/v1/search/activity?q=index").success(fn);
    };
    this.addNameToIndex = function(name) {
      return api.postJson("/v1/search/indexes/" + name);
    };
    this.removeNameFromIndex = function(name) {
      return api.deleteJson("/v1/search/indexes/" + name);
    };
    this.addNamesToIndex = function(namesJsonArray) {
      var words = _.pluck(namesJsonArray, "word");
      return api.postJson("/v1/search/indexes/batch", words);
    };
    this.removeNamesFromIndex = function(namesJsonArray) {
      var words = _.pluck(namesJsonArray, "word");
      return api.deleteJson("/v1/search/indexes/batch", words);
    };
    this.getRecentFeedbacks = function(fn) {
      return api.get("/v1/feedbacks").success(fn);
    };
    this.getFeedback = function(word, fn) {
      return api
        .get("/v1/feedbacks/", {
          word: word,
          feedback: true
        })
        .success(function(resp) {
          return fn(resp);
        });
    };
    this.deleteFeedbacks = function(word, fn) {
      return api
        .deleteJson("/v1/feedbacks/?word=" + word)
        .success(fn)
        .error(function() {
          return toastr.error(
            "Feedbacks on " + word + " were not deleted. Please try again."
          );
        });
    };
    this.deleteFeedback = function(id, fn) {
      return api
        .deleteJson("/v1/feedbacks/" + id)
        .success(fn)
        .error(function() {
          return toastr.error("Feedback was not deleted. Please try again.");
        });
    };
  }
]);
