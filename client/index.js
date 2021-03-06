window.jQuery = require('jquery');
require('style!raw!./css/bootstrap.css');
require('./bootstrap.js');

const angular = require('angular');

const fileSyncApp = angular.module('fileSyncApp',[]);

fileSyncApp.factory('findDifferenceSvc', ['$http', ($http)=>{
    return {
        query: function(sourceDir, targetDir){
            return $http({
                method:'GET',
                url:'api/findDifference',
                params:{sourceDir:sourceDir, targetDir:targetDir}
            })
        }
    }
}]);

fileSyncApp.factory('applyChangeSvc', ['$http', ($http)=>{
    return{
        apply: function(sourceDir, targetDir, data){
            return $http.post('api/applyChange', {operations:data});
        }    
    }
}]);

fileSyncApp.controller('mainController', ['$scope','findDifferenceSvc','applyChangeSvc',($scope,findDifferenceSvc,applyChangeSvc)=>{
    var predefinedDir = {};
    if (location.search){
        predefinedDir = location.search.substring(1).split('&').reduce(function(prev, curr){prev[curr.split('=')[0]]=curr.split('=')[1]; return prev;}, {});
    }

    $scope.sourceDir = predefinedDir.sourceDir||undefined;
    $scope.targetDir = predefinedDir.targetDir||undefined;
    $scope.diffs = [];
    $scope.hideEqualFiles = true;
    $scope.comparing = false;
    $scope.compare = function(){
        if (!$scope.sourceDir||!$scope.targetDir){
            alert('Source and Target dir can not be empty')
        }else{
            $scope.diffs=[];
            $scope.comparing = true;
            findDifferenceSvc.query($scope.sourceDir, $scope.targetDir).then(
                (response)=> {
                    $scope.index={};
                    $scope.index.diffs = response.data.reduce((prev, curr)=>{
                        prev[curr.file] = curr;
                        return prev;
                    }, {});
                    $scope.diffs = response.data;
                    $scope.comparing = false;
                },
                ()=> {
                    $scope.comparing=false;
                }
            )    
        }
    }

    $scope.toggle = function(item){
        if (item.selected) {
            item.selected=false;
        }else{
            item.selected=true
        }
    }

    $scope.hideEquals = function(){
        if ($scope.hideEqualFiles){
            $scope.hideEqualFiles=false;
        }else{
            $scope.hideEqualFiles=true;
        }
    }

    $scope.getSelectedCommands=function(){
        return $scope.diffs.filter((item)=>item.selected).map((item)=>{
                return {direction: item.direction, command: item.command}
        });
    }
    $scope.applyChange = function(){
        if (!$scope.sourceDir||!$scope.targetDir){
            alert('Source and Target dir can not be empty')
        }else{
            var data = $scope.getSelectedCommands();

            applyChangeSvc.apply($scope.sourceDir, $scope.targetDir, data).then(
                ()=>alert('Operation finished successfully!'),
                (err)=>alert(`Error encounterred, check ${err.fromArchive} and ${err.toArchive} files to perform recovery`)
            );
        }
    }

}]);

fileSyncApp.directive('fileSync', [()=>{
    return {
        template:`<div class='container'>
                    <div id="myModal" class="modal fade" role="dialog">
                        <div class="modal-dialog">
                            <!-- Modal content-->
                            <div class="modal-content">
                                <div class="modal-header">
                                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                                    <h4 class="modal-title">Confirming Overwrite</h4>
                                </div>
                                <div class="modal-body">
                                    <header> Confirm that You want to synchronize these two directories with the following commands</header>
                                    <div ng-repeat="command in diffs" ng-show='command.selected==true&&command.direction!=="=="' style="border-bottom:1px solid black">
                                        {{command.command}}
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-primary" data-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-default" data-dismiss="modal" ng-click="applyChange()">Confirm</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class='row'>
                        <label class='col-lg-5 text-center'>Source Directory</label>
                        <div class='col-lg-2'>
                            <div class='row'>
                            <span class='col-lg-1 glyphicon glyphicon-unchecked' ng-click='hideEquals()' ng-show='!hideEqualFiles'/>
                            <span class='col-lg-1 glyphicon glyphicon-check' ng-click='hideEquals()' ng-show='hideEqualFiles'/>
                            <span class='col-lg-10'>Hide identitcal files</span>
                            </div>
                        </div>
                        <label class='col-lg-5 text-center'>Target Directory</label>
                    </div>
                    <div class='row'>
                        <input id='sourceDir' ng-model='sourceDir' class='col-lg-5'/>
                        <button ng-click='compare()' class='col-lg-2' ng-disabled='comparing'>Compare</button>
                        <input id='targetDir' ng-model='targetDir' class='col-lg-5'/>
                        <button style='position:absolute' data-toggle="modal" data-target="#myModal">ApplyChange</button>
                    </div>
                    <div class='row' id="{{diff.file}}" ng-repeat='diff in diffs' ng-show='!hideEqualFiles||diff.direction!=="=="' style='box-shadow: 0 0 2px black'>
                        <div class='col-lg-5'>
                            <div class='row'>
                                <span class='col-lg-1 glyphicon glyphicon-file' ng-show='diff.sourceName&&index.diffs[diff.file].type==="FILE"'/>
                                <span class='col-lg-1 glyphicon glyphicon-folder-open' ng-show='diff.sourceName&&index.diffs[diff.file].type==="DIR"'/>
                                <span class='col-lg-11' data-toggle="tooltip" title='Full Name:{{diff.sourceName}} Size:{{index.diffs[diff.file].sourceSize}}; Last Modified:{{index.diffs[diff.file].sourceTime| date:"medium"}}'>{{diff.sourceName.substring(sourceDir.length)}}</span>
                            </div>
                        </div>
                        
                        <span class='col-lg-2 text-center glyphicon glyphicon-check' ng-click='toggle(diff)' ng-show='diff.selected'></span>
                        <span class='col-lg-2 text-center' ng-click='toggle(diff)' ng-show='!diff.selected'>{{diff.direction}}</span>

                        <div class='col-lg-5'>
                            <div class='row'>
                                <span class='col-lg-1 glyphicon glyphicon-file' ng-show='diff.targetName&&index.diffs[diff.file].type==="FILE"'/>
                                <span class='col-lg-1 glyphicon glyphicon-folder-open' ng-show='diff.targetName&&index.diffs[diff.file].type==="DIR"'/>
                                <span class='col-lg-11' data-toggle="tooltip" title='Full Name:{{diff.targetName}} Size:{{index.diffs[diff.file].targetSize}}; Last Modified:{{index.diffs[diff.file].targetTime| date:"medium"}}'>{{diff.targetName.substring(targetDir.length)}}</span>
                            </div>
                        </div>
                    </div>
                  </div>`,
        link: function(scope, element, attrs){

        }
    }
}]);

