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

		$scope.$on("rs:e", function (evt, info) {
			vm.user = info.user;
			vm.token = info.token;
			vm.resolved = info.resolved;
			return e.subfolders(vm.compare.basePaths.truth).then(function (res) {
				vm.compare.lists = {
					truth: res,
					check: res
				};
				$scope.$digest();
			});
		});

		$scope.$on("rs:update-list", function (evt, p, type, list) {
			vm.compare.lists[type] = list;
			console.log(list, vm.compare, p)
			$scope.$digest(vm.compare.lists[type]);
		});

		// $scope.$on("rs:digest-compare", function () {
		// 	$scope.$digest(vm.compare);
		// });
	}
}());
