"use strict";

(function () {
	angular
		.module("egnyte", [
			"ui.router",
			"ds.objectDiff",
			"rzModule",
			"ngCookies"
		])
		.config(States)
		.run(Run)
		.constant("urlBase", window.location.origin)
		.constant("emuBase", "Shared/Projects")

	States.$inject = ["$stateProvider", "$locationProvider"];
	function States($stateProvider, $locationProvider) {
		$locationProvider.html5Mode(true);
		$stateProvider
			.state("main", {
				url: "/",
				controller: "CompareCtrl",
				controllerAs: "vm",
				templateUrl: "templates/compare.html"
			});
	}

	Run.$inject = ["$rootScope", "e"];
	function Run($rootScope, e) {
		if (!e.token || !e.key) {
			e.login().then(function () {
				$rootScope.$broadcast("rs:e", e);
			});
		} else {
			e.API.auth.token = e.token;
			e.API.auth.options.key = e.key;
			e.API.auth.getUserInfo().then(function (info) {
				e.user = info;
				e.resolved = true;
				$rootScope.$broadcast("rs:e", e);
			});
		}
	}
}());
