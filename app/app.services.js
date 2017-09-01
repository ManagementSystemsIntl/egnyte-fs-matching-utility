"use strict";

(function () {
	angular
		.module("egnyte")
		.service("e", EgnyteService);

	EgnyteService.$inject = ["$cookies", "$q", "$window", "emuBase", "ObjectDiff", "urlBase"];
	function EgnyteService($cookies, $q, $window, emuBase, ObjectDiff, urlBase) {
		var domain = $cookies.get("egnyte_domain") || $window.prompt("Please provide your Egnyte domain:");
		var domainUrl = "https://" + domain + ".egnyte.com";
		var key = $cookies.get("key") || $window.prompt("Please provide a valid Egnyte API key for " + domain + ":");

		var e = Egnyte.init(domainUrl, {
			key: key,
			mobile: true
		});

		e.token = sessionStorage.getItem("token");
		e.key = key;
		e.domain = domain;
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
				truth: undefined,
				check: undefined
			},
			basePaths: {
				truth: emuBase,
				check: emuBase
			},
			lists: {
				truth: undefined,
				check: undefined
			},
			depth: {
				value: 2
			},
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
						$cookies.put("egnyte_domain", domain, {expires: new Date(2020, 0, 1)});
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
			$cookies.remove("egnyte_domain");
			$window.location.reload();
		}

		function makeQueryV2(endpoint, method, opts) {
			var reqOpts = {
				url: [domainUrl, "pubapi", "v2", endpoint].join("/"),
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
				url: [domainUrl, "pubapi", "v1", endpoint].join("/"),
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

		function updatePath(pathType, direction) {
			var p = configBasePath(pathType, direction);
			if (!p) return false;
			return getSubfolders(p).then(function (res) {
				var path = e.compare.basePaths[pathType] === p ? e.compare.paths[pathType] : calcPath(pathType, direction, res);
				return {
					basePath: p,
					list: res,
					path: path
				};
			});

			function configBasePath(type, dir) {
				if (dir > 0) {
					return [e.compare.basePaths[type], e.compare.paths[type]].join("/");
				}
				if (e.compare.basePaths[type] === emuBase) return emuBase;
				return e.compare.basePaths[type].split("/").slice(0, -1).join("/");
			}

			function calcPath(type, dir, list) {
				return dir > 0 ? list[0] : e.compare.basePaths[type].split("/").splice(-1)[0]
			}
		}

		function comparePaths() {
			e.compare.processing = true;
			return $q.all([buildTemplate(compilePathname("truth"), e.compare.depth.value), buildTemplate(compilePathname("check"), e.compare.depth.value)])
				.then(function (paths) {
					e.compare.trees.truth = paths[0];
					e.compare.trees.check = paths[1];
					e.compare.processing = false;
					e.compare.done = true;
					e.compare.rawDiff = ObjectDiff.diffOwnProperties(paths[0], paths[1]);
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
				if (!paths) {
					deferred.resolve(fileObj);
					return deferred.promise;
				}
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
						return false;
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
