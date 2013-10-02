var myApp = angular.module('myApp', ['ui.bootstrap', 'ngCookies']).
                config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
                    $routeProvider.
                        when('/', {controller: ShortenCtrl, templateUrl: 'static/partials/shortenForm.html'}).
                        when('/create', {controller: CreateCtrl, templateUrl: 'static/partials/newShortenUrl.html'}).
                        otherwise({templateUrl: 'static/partials/NoUrlExists.html'})
                    $locationProvider.html5Mode(true).hashPrefix('!');
                }]).

                filter('reverseAndDropFirst', function() {
                    return function(items) {
                        return items.slice().reverse().slice(1);
                    };
                });

function ShortenCtrl($scope, $location, $http, $cookieStore) {

    $location.replace();

    $scope.form = {
        alert: {
            type: '',
            errorText: ''
        },
        shortUrl: {
            type: '',
            errorText: ''
        }
    }

    $scope.submitForm = function() {
        var formData = {
            long: this.longUrl,
            short: (this.shortUrl ? this.shortUrl : '')
        };
        $http.post('/create', formData)
        .success(function(data, status, headers, config) {
            console.log(data);
            var urls = [];
            if($cookieStore.get('urls')) {
                urls = $cookieStore.get('urls');
            }
            urls.push({longUrl: data.longUrl, shortUrl: data.shortUrl});
            // $cookieStore.put('longUrl', data.longUrl);
            // $cookieStore.put('shortUrl', data.shortUrl);
            $cookieStore.put('urls', urls);
            $location.path('/create');
        }).error(function(data, status, headers, config) {
            console.log($cookieStore.get('urls'));
            $scope.form.shortUrl.type = data.error.type;
            $scope.form.shortUrl.errorText = data.error.errorText;
        });
    }

    $scope.goHome = function() {
        return $location.path('/');
    }
    $scope.removeErrorTextIfAny = function() {
        $scope.form.shortUrl.type = '';
        $scope.form.shortUrl.errorText = '';
    }

    $scope.removeAlert = function() {
        $scope.form.alert.type = '';
        $scope.form.alert.errorText = '';
    }
}

function CreateCtrl($scope, $location, $cookieStore) {

    $scope.urls = $cookieStore.get('urls');

    if(! $scope.urls || $scope.urls.length == 0) {
        $location.path('/');
    }

    $scope.isValid = function() {
        return $scope.urls;
    }

    $scope.goHome = function() {
        return $location.path('/').search(null);
    }

    $scope.getLongUrl = function() {
        return $scope.urls[$scope.urls.length - 1].longUrl;
    }

    $scope.getShortUrl = function() {
        return $scope.urls[$scope.urls.length - 1].shortUrl;
    }

    $scope.goToShortUrl = function() {
        $location.path(this.getShortUrl());
    }
}