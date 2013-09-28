var myApp = angular.module('myApp', ['ui.bootstrap', 'ngCookies']).
                config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
                    $routeProvider.
                        when('/', {controller: ShortenCtrl, templateUrl: 'static/partials/shortenForm.html'}).
                        when('/create', {controller: CreateCtrl, templateUrl: 'static/partials/newShortenUrl.html'});
                    $locationProvider.html5Mode(true).hashPrefix('!');
                }]);


function ShortenCtrl($scope, $location, $http, $cookieStore) {

    $location.replace();

    $scope.submitForm = function() {
        var formData = {
            long: this.longUrl,
            short: (this.shortUrl ? this.shortUrl : '')
        };
        $http.post('/create', formData)
        .success(function(data, status, headers, config) {
            $cookieStore.put('longUrl', data.longUrl);
            $cookieStore.put('shortUrl', data.shortUrl);
            $location.path('/create').search({longUrl: data.longUrl, shortUrl: data.shortUrl});
        }).error(function(data, status, headers, config) {
            console.log(data);
        });
    }

    $scope.goHome = function() {
        return $location.path('/');
    }

}

function CreateCtrl($scope, $location, $cookieStore) {
    // TODO: Remove $cookieStore if not going to use

    if ($location.search().shortUrl == undefined || $location.search().shortUrl == '') {
        $location.path('/');
    }

    $scope.goHome = function() {
        return $location.path('/').search(null);
    }

    $scope.getLongUrl = function() {
        return $location.search().longUrl;
    }

    $scope.getShortUrl = function() {
        return $location.search().shortUrl;
    }

    $scope.goToShortUrl = function() {
        $location.path(this.getShortUrl());
    }
}