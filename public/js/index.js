var myApp = angular.module('myApp', ['ui.bootstrap', 'ngCookies']).
                config(['$routeProvider', function($routeProvider) {
                    $routeProvider.
                        when('/', {controller: ShortenCtrl, templateUrl: 'static/partials/shortenForm.html'}).
                        when('/create', {controller: CreateCtrl, templateUrl: 'static/partials/newShortenUrl.html'});
                }]);

function ShortenCtrl($scope, $location, $http, $cookieStore) {

    $scope.submitForm = function() {
        var formData = {
            long: this.longUrl,
            short: (this.shortUrl ? this.shortUrl : '')
        };
        $http.post('/create', formData)
        .success(function(data, status, headers, config) {
            $cookieStore.put('longUrl', data.longUrl);
            $cookieStore.put('shortUrl', data.shortUrl);
            $location.path('/create');
        }).error(function(data, status, headers, config) {
            console.log(data);
        });
    }

    $scope.goHome = function() {
        return $location.path('/');
    }

}

function CreateCtrl($scope, $location, $cookieStore) {

    if ($cookieStore.get('shortUrl') == undefined || $cookieStore.get('shortUrl') == '') {
        $location.path('/');
    }

    $scope.goHome = function() {
        return $location.path('/');
    }

    $scope.getLongUrl = function() {
        return $cookieStore.get('longUrl');
    }

    $scope.getShortUrl = function() {
        return $cookieStore.get('shortUrl');
    }
}