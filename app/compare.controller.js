"use strict";

(function () {
	angular
		.module("egnyte")
		.controller("CompareCtrl", CompareCtrl);

	CompareCtrl.$inject = ["$scope", "e"];
	function CompareCtrl($scope, e) {
		var vm = this;
		vm.logout = e.logout;
		vm.resolved = e.resolved;
		vm.user = null;
		vm.token = null;
		vm.compare = e.compare;
		vm.updatePath = updatePath;

		$scope.$on("rs:e", function (evt, info) {
			vm.user = info.user;
			vm.token = info.token;
			vm.resolved = info.resolved;
			return e.subfolders(vm.compare.basePaths.truth).then(function (res) {
				vm.compare.lists = {
					truth: res,
					check: res
				};
				vm.compare.paths = {
					truth: res[0],
					check: res[0]
				};
				$scope.$digest(vm.compare);
			});
		});

		function updatePath(pathType, direction) {
			return e.compare.updatePath(pathType, direction).then(function (res) {
				vm.compare.basePaths[pathType] = res.basePath;
				vm.compare.lists[pathType] = res.list;
				vm.compare.paths[pathType] = res.path;
				$scope.$digest(vm.compare);
			});
		}
	}
}());
