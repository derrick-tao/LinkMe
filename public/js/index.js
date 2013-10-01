var myApp = angular.module('myApp', ['ui.bootstrap', 'ngCookies']).
                config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
                    $routeProvider.
                        when('/', {controller: ShortenCtrl, templateUrl: 'static/partials/shortenForm.html'}).
                        when('/create', {controller: CreateCtrl, templateUrl: 'static/partials/newShortenUrl.html'}).
                        otherwise({templateUrl: 'static/partials/NoUrlExists.html'})
                    $locationProvider.html5Mode(true).hashPrefix('!');
                }]);


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
            if (data.error) {
                $scope.form.shortUrl.type = data.error.type;
                $scope.form.shortUrl.errorText = data.error.errorText;
            } else {
                $cookieStore.put('longUrl', data.longUrl);
                $cookieStore.put('shortUrl', data.shortUrl);
                $location.path('/create');
            }
        }).error(function(data, status, headers, config) {
            $scope.form.alert.type = 'danger';
            $scope.form.alert.errorText = data;
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

    if(! ($cookieStore.get('longUrl') && $cookieStore.get('shortUrl'))) {
        $location.path('/');
    }

    $scope.isValid = function() {
        return ($cookieStore.get('longUrl') && $cookieStore.get('shortUrl'));
    }

    $scope.goHome = function() {
        return $location.path('/').search(null);
    }

    $scope.getLongUrl = function() {
        return $cookieStore.get('longUrl');
    }

    $scope.getShortUrl = function() {
        return $cookieStore.get('shortUrl');
    }

    $scope.goToShortUrl = function() {
        $location.path(this.getShortUrl());
    }
}