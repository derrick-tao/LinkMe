var myApp = angular.module('myApp', ['ui.bootstrap']).
                config(['$routeProvider', function($routeProvider) {
                    $routeProvider.
                        when('/', {controller: ShortenCtrl, templateUrl: 'static/partials/shortenForm.html'}).
                        when('/new', {controller: ShortenCtrl, templateUrl: 'static/partials/newShortenUrl.html'});
                }]);

function ShortenCtrl($scope, $location, $http) {

    $scope.submitForm = function() {
        console.log(this);
        var formData = {
            long: this.longUrl,
            short: (this.shortUrl ? this.shortUrl : '')
        };
        $http.post('/create', formData)
        .success(function(data, status, headers, config) {
            $scope.data = data;
            console.log($scope);
            $location.path('/new');
        }).error(function(data, status, headers, config) {
            console.log(data);
        });
    }

    $scope.getLongUrl = function() {
        return $scope.data.longUrl;
    }

    $scope.getShortUrl = function() {
        return $scope.data.shortUrl;
    }
}