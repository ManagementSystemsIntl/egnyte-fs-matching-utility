"use strict";

(function () {
	angular
		.module("egnyte", [
			"ui.router"
		])
		.config(States)
		.run(Run)
		.constant("domain", "https://msiworldwide.egnyte.com")
		.constant("key", "your key here")
		.constant("urlBase", window.location.origin)
		.controller("MainCtrl", MainCtrl)
		.service("e", EgnyteService)
		.service("fs", FsService);

	// --------------------------------------

	States.$inject = ["$stateProvider", "$locationProvider"];
	function States($stateProvider, $locationProvider) {
		$locationProvider.html5Mode(true);

		$stateProvider
			.state("main", {
				url: "/",
				controller: "MainCtrl",
				controllerAs: "MainVM",
				templateUrl: "templates/main.html"
			});
	}

	// --------------------------------------

	Run.$inject = ["$rootScope", "e"];
	function Run($rootScope, e) {
		if (!e.token) {
			e.login().then(function () {
				$rootScope.$broadcast("rs:e", e);
			});
		} else {
			e.API.auth.token = e.token;
			e.API.auth.getUserInfo().then(function (info) {
				e.user = info;
				e.resolved = true;
				$rootScope.$broadcast("rs:e", e);
			});
		}
	}

	// --------------------------------------

	EgnyteService.$inject = ["$q", "domain", "key", "urlBase"];
	function EgnyteService($q, domain, key, urlBase) {
		var e = Egnyte.init(domain, {
			key: key,
			mobile: true
		});

		e.token = sessionStorage.getItem("token");
		e.login = login;
		e.user = null;
		e.resolved = false;
		e.makeQuery = {
			v1: makeQueryV1,
			v2: makeQueryV2
		};

		return e;

		// //////////////

		function login() {
			var deferred = $q.defer();
			e.API.auth.requestTokenPopup(
				function () {
					return e.API.auth.getUserInfo().then(function (info) {
						e.user = info;
						e.token = e.API.auth.token;
						e.resolved = true;
						sessionStorage.setItem("token", e.API.auth.token);
						deferred.resolve(e);
					});
				},
				function () {
					deferred.reject("denied");
				},
				[urlBase, "empty.html"].join("/")
			);
			return deferred.promise;
		}

		function makeQueryV2(endpoint, method, opts) {
			var reqOpts = {
				url: [domain, "pubapi", "v2", endpoint].join("/"),
				method: method,
				headers: {},
				params: opts
			};

			return e.API.manual.promiseRequest(reqOpts).then(function (res) {
				return res.body;
			}).fail(function (err, res, body) {
				console.log("ERROR:", err, res, body);
				return err;
			});
		}

		function makeQueryV1(endpoint, method, opts) {
			var reqOpts = {
				url: [domain, "pubapi", "v1", endpoint].join("/"),
				method: method,
				headers: {},
				params: opts
			};

			return e.API.manual.promiseRequest(reqOpts).then(function (res) {
				return res.body;
			}).fail(function (err, res, body) {
				console.log("ERROR:", err, res, body);
				return err;
			});
		}
	}

	// --------------------------------------

	FsService.$inject = [];
	function FsService() {
		return {};
	}

	// --------------------------------------

	MainCtrl.$inject = ["$q", "$scope", "$timeout", "e", "fs"];
	function MainCtrl($q, $scope, $timeout, e, fs) {
		var vm = this;

		vm.logout = logout;
		vm.resolved = e.resolved;
		vm.user = null;
		vm.token = null;
		vm.getGroups = getGroups;
		vm.getGroup = getGroup;
		vm.groups = fs.groups;
		vm.group = null;
		vm.searchFolders = searchFolders;
		vm.searchResult = null;
		vm.search = {
			query: null,
			type: "FOLDER"
		};

		buildTemplate(2);

		$scope.$on("rs:e", function (evt, info) {
			vm.user = info.user;
			vm.token = info.token;
			vm.resolved = info.resolved;
			getGroups();
		});

		// ////////////

		function logout() {
			sessionStorage.removeItem("token");
			window.location.reload();
		}

		function getGroups() {
			var si = 1;
			var count = 100;
			var time;
			return queryGroups();

			function queryGroups() {
				return e.makeQuery.v2("groups", "GET", {"count": count, "startIndex": si}).then(function (res) {
					if (fs.hasOwnProperty("groups")) {
						res.resources.forEach(function (g) {
							fs.groups.push(g);
						});
					} else {
						fs.groups = res.resources;
					}

					if (fs.groups.length === res.totalResults) {
						try {
							time();
						} catch (err) {
							//
						}
						vm.groups = fs.groups;
						$scope.$digest();
						return;
					} else if (res.startIndex + res.itemsPerPage - 1 < res.totalResults) {
						si += count;
						time = $timeout(queryGroups, 500);
					}
				});
			}
		}

		function getGroup(id) {
			return e.makeQuery.v2(["groups", id].join("/"), "GET", {}).then(function (res) {
				vm.group = res;
				$scope.$digest();
			});
		}

		function searchFolders(page) {
			var count = 20;
			vm.search.page = page;
			var opts = {
				query: vm.search.query,
				type: vm.search.type,
				folder: vm.search.folder,
				offset: vm.search.page * count
			};
			return e.makeQuery.v1("search", "GET", opts).then(function (res) {
				vm.searchResult = res;
				vm.search.hasMore = res.hasMore;
				vm.search.totalPages = Math.ceil(res.total_count / count);
				$scope.$digest();
			});
		}

		function buildTemplate(depth) {
			var startPath = "Shared/Projects/000 TemplateProjFolder";
			var fileObj = {};
			var deferred = $q.defer();
			// var folderCount = 0;
			// var queryCount = 0;
			// deferred.promise;
			// deferred.resolve();
			// deferred.reject();

			buildFs(startPath, 0);

			function buildFs(path, level) {
				var p = ["fs", path].join("/");
				return e.makeQuery.v1(p, "GET", {}).then(function (res) {
					if (res.hasOwnProperty("folders")) {
						$q.all(res.folders.map(function (f) {
							return traverse(parsePath(f.path), fileObj);
						})).then(function (q) {
							console.log(q);
							level++;
							if (level >= depth) {
								console.log("here only once");
                deferred.resolve(fileObj);
                return deferred.promise;
							} else {
                $q.all(res.folders.map(function (f) { return buildFs(f.path, level)}));
              }
						});
						// queryCount += res.folders.length;
						// res.folders.forEach(function (f, i) {
						//   var p = parsePath(f.path);
						//   traverse(p, fileObj);
						// });
						// level++;
						// if (level >= depth && level > 0) {
						//   // console.log("queries", queryCount);
						//   // if (queryCount === folderCount) {
						//   //   console.log(fileObj, "hello")
						//   // }
						// } else {
						//   res.folders.forEach(function (f) {
						//     buildFs(f.path, level);
						//   });
						// }
					}
				});
			}

			function parsePath(path) {
				return path.replace("/" + startPath + "/", "").split("/");
			}

			function traverse(path, tree) {
				var deferred = $q.defer();
				if (path.length === 1) {
					tree[path[0]] = {};
					// folderCount++;
					deferred.resolve(1);
					return deferred.promise;
				}
				var t = path.splice(0, 1);
				return traverse(path, tree[t]);
			}
		}
	}
}());
