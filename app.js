"use strict";

(function () {
	angular
		.module("egnyte", [
			"ui.router",
			"ds.objectDiff"
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
				controllerAs: "vm",
				templateUrl: "templates/compare.html"
			});
			// .state("main", {
			// 	url: "/",
			// 	controller: "MainCtrl",
			// 	controllerAs: "MainVM",
			// 	templateUrl: "templates/main.html"
			// });
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

	MainCtrl.$inject = ["$q", "$scope", "$timeout", "e", "fs", "ObjectDiff"];
	function MainCtrl($q, $scope, $timeout, e, fs, ObjectDiff) {
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
		vm.compare = {
			go: comparePaths,
			done: false,
			processing: false,
			paths: {
				truth: "000 TemplateProjFolder",
				check: undefined
			},
			basePaths: {
				truth: "Shared/Projects",
				check: "Shared/Projects"
			},
			depth: 2,
			trees: {
				truth: undefined,
				check: undefined
			}
		};

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

		function comparePaths() {
			vm.compare.processing = true;
			return $q.all([buildTemplate(compilePathname("truth"), vm.compare.depth), buildTemplate(compilePathname("check"), vm.compare.depth)])
			.then(function (paths) {
				vm.compare.trees.truth = paths[0];
				vm.compare.trees.check = paths[1];
				vm.compare.processing = false;
				vm.compare.done = true;
				var diff = ObjectDiff.diffOwnProperties(paths[0], paths[1]);
				vm.compare.diff = ObjectDiff.toJsonView(diff); 
			});

			function compilePathname(type) {
				if (!vm.compare.paths[type]) return vm.compare.basePaths[type];
				return [vm.compare.basePaths[type], vm.compare.paths[type]].join("/");
			}
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

		function buildTemplate(startPath, depth) {
			var fileObj = {};
			var deferred = $q.defer();

			return buildFs([startPath], 0);

			function buildFs(paths, level) {
				return $q.all(paths.map(function (p) {
					return queryPath(p);
				})).then(function (res) {
					if (level + 1 >= depth) {
						deferred.resolve(fileObj);
						return deferred.promise;
					} else {
						return buildFs(res[0], level + 1);
					}
				});

				function queryPath(path) {
					return e.makeQuery.v1(["fs", path].join("/"), "GET", {}).then(function (res) {
						if (res.hasOwnProperty("folders")) {
							return $q.all(res.folders.map(function (f) {
								return traverse(parsePath(f.path), fileObj, f.path);
							}));
						}
					});

					function parsePath(path) {
						return path.replace("/" + startPath + "/", "").split("/");
					}

					function traverse(path, tree, origPath) {
						var deferred = $q.defer();
						if (path.length === 1) {
							tree[path[0]] = {};
							deferred.resolve(origPath);
							return deferred.promise;
						}
						var t = path.splice(0, 1);
						return traverse(path, tree[t], origPath);
					}
				}
			}
		}
	}
}());
