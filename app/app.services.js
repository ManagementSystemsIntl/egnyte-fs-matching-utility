"use strict";

(function () {
	angular
		.module("egnyte")
		.service("e", EgnyteService);

	EgnyteService.$inject = ["$cookies", "$q", "$window", "domain", "ObjectDiff", "urlBase"];
	function EgnyteService($cookies, $q, $window, domain, ObjectDiff, urlBase) {
		var e = Egnyte.init(domain, {
			key: $cookies.get("key") || $window.prompt("Please provide egnyte api key."),
			mobile: true
		});

		e.token = sessionStorage.getItem("token");
		e.key = $cookies.get("key");
		e.login = login;
		e.logout = logout;
		e.user = null;
		e.resolved = false;
		e.makeQuery = {
			v1: makeQueryV1,
			v2: makeQueryV2
		};
		e.compare = {
			go: comparePaths,
			updatePath: updatePath,
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
			lists: {
				truth: undefined,
				check: undefined
			},
			depth: 2,
			trees: {
				truth: undefined,
				check: undefined
			}
		};
		e.subfolders = getSubfolders;

		return e;

		//---------------------------

		function login() {
			var deferred = $q.defer();
			e.API.auth.requestTokenPopup(
				function () {
					return e.API.auth.getUserInfo().then(function (info) {
						e.user = info;
						e.token = e.API.auth.token;
						e.key = e.API.auth.options.key;
						e.resolved = true;
						sessionStorage.setItem("token", e.API.auth.token);
						$cookies.put("key", e.API.auth.options.key, {expires: new Date(2020, 0, 1)});
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

		function logout() {
			sessionStorage.removeItem("token");
			$cookies.remove("key");
			$window.location.reload();
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

		function getSubfolders(path) {
			return e.makeQuery.v1(["fs", path].join("/"), "GET", {}).then(function (res) {
				if (res.hasOwnProperty("folders")) {
					return res.folders.map(function (f) { return f.path.replace("/" + path + "/", ""); });
				}
				return [];
			});
		}

		//// working on this
		function updatePath(pathType, direction) {
			if (direction > 0) {
				var p = consolidateBasePath(pathType);
			}
			getSubfolders(p).then(function (res) {
				return $rootScope.$broadcast("rs:update-list", p, pathType, res);
			}).catch(function (err) { console.log(err)});

			function consolidateBasePath(type) {
				return [e.compare.basePaths[type], e.compare.paths[type]].join("/");
			}
		}

		function comparePaths() {
			e.compare.processing = true;
			return $q.all([buildTemplate(compilePathname("truth"), e.compare.depth), buildTemplate(compilePathname("check"), e.compare.depth)])
				.then(function (paths) {
					e.compare.trees.truth = paths[0];
					e.compare.trees.check = paths[1];
					e.compare.processing = false;
					e.compare.done = true;
					e.compare.rawDiff = ObjectDiff.diffOwnProperties(paths[0], paths[1]);;
					e.compare.diff = ObjectDiff.toJsonView(e.compare.rawDiff);
				});

			function compilePathname(type) {
				if (!e.compare.paths[type]) return e.compare.basePaths[type];
				return [e.compare.basePaths[type], e.compare.paths[type]].join("/");
			}
		}

		function buildTemplate(startPath, depth) {
			var fileObj = {};
			var deferred = $q.defer();

			return buildFs([startPath], 0);

			function buildFs(paths, level) {
				return $q.all(paths.map(function (p) {
					return queryPath(p, startPath, fileObj);
				})).then(function (res) {
					if (level + 1 >= depth) {
						deferred.resolve(fileObj);
						return deferred.promise;
					}
					return buildFs(res[0], level + 1);
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
