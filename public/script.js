var myApp = angular.module('myApp', ['ui.bootstrap']);

function ShortenCtrl($scope, $http) {
    $scope.submitForm = function() {
        a = this;
        console.log(this);
        var formData = {
            long: this.longUrl,
            short: (this.shortUrl ? this.shortUrl : '')
        };
        $http.post('/create', formData)
        .success(function(data, status, headers, config) {
            alert('success');
        }).error(function(data, status, headers, config) {
            alert('failed');
        });
    }
}