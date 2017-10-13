'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NodeGradingController = function () {
    function NodeGradingController($filter, $mdDialog, $scope, $stateParams, AnnotationService, ConfigService, NotificationService, ProjectService, StudentStatusService, TeacherDataService) {
        var _this = this;

        _classCallCheck(this, NodeGradingController);

        this.$filter = $filter;
        this.$mdDialog = $mdDialog;
        this.$scope = $scope;
        this.$stateParams = $stateParams;
        this.AnnotationService = AnnotationService;
        this.ConfigService = ConfigService;
        this.NotificationService = NotificationService;
        this.ProjectService = ProjectService;
        this.StudentStatusService = StudentStatusService;
        this.TeacherDataService = TeacherDataService;

        this.$translate = this.$filter('translate');

        this.nodeId = this.$stateParams.nodeId;

        // the max score for the node
        this.maxScore = this.ProjectService.getMaxScoreForNode(this.nodeId);
        this.nodeHasWork = this.ProjectService.nodeHasWork(this.nodeId);

        this.sort = this.TeacherDataService.nodeGradingSort;

        this.hiddenComponents = [];

        // TODO: add loading indicator
        this.TeacherDataService.retrieveStudentDataByNodeId(this.nodeId).then(function (result) {

            // field that will hold the node content
            _this.nodeContent = null;

            _this.teacherWorkgroupId = _this.ConfigService.getWorkgroupId();

            var node = _this.ProjectService.getNodeById(_this.nodeId);

            if (node != null) {

                // field that will hold the node content
                _this.nodeContent = node;
            }

            _this.workgroups = _this.ConfigService.getClassmateUserInfos();
            _this.workgroupsById = {}; // object that will hold workgroup names, statuses, scores, notifications, etc.
            _this.workVisibilityById = {}; // object that specifies whether student work is visible for each workgroup
            _this.workgroupInViewById = {}; // object that holds whether the workgroup is in view or not

            var permissions = _this.ConfigService.getPermissions();
            _this.canViewStudentNames = permissions.canViewStudentNames;

            _this.setWorkgroupsById();

            _this.nRubrics = _this.ProjectService.getNumberOfRubricsByNodeId(_this.nodeId);

            // scroll to the top of the page when the page loads
            document.body.scrollTop = document.documentElement.scrollTop = 0;
        });

        this.$scope.$on('projectSaved', function (event, args) {
            // update maxScore
            _this.maxScore = _this.ProjectService.getMaxScoreForNode(_this.nodeId);
        });

        this.$scope.$on('notificationAdded', function (event, notification) {
            if (notification.type === 'CRaterResult') {
                // there is a new CRaterResult notification
                // TODO: expand to encompass other notification types that should be shown to teacher
                var workgroupId = notification.toWorkgroupId;
                if (_this.workgroupsById[workgroupId]) {
                    _this.updateWorkgroup(workgroupId);
                }
            }
        });

        this.$scope.$on('notificationChanged', function (event, notification) {
            if (notification.type === 'CRaterResult') {
                // a CRaterResult notification has changed
                // TODO: expand to encompass other notification types that should be shown to teacher
                var workgroupId = notification.toWorkgroupId;
                if (_this.workgroupsById[workgroupId]) {
                    _this.updateWorkgroup(workgroupId);
                }
            }
        });

        this.$scope.$on('annotationReceived', function (event, args) {
            var annotation = args.annotation;

            if (annotation) {
                var workgroupId = annotation.toWorkgroupId;
                var _nodeId = annotation.nodeId;
                if (_nodeId === _this.nodeId && _this.workgroupsById[workgroupId]) {
                    // a workgroup has a new annotation for this node
                    _this.updateWorkgroup(workgroupId);
                }
            }
        });

        this.$scope.$on('studentWorkReceived', function (event, args) {
            var studentWork = args.studentWork;

            if (studentWork != null) {
                var workgroupId = studentWork.workgroupId;
                var _nodeId2 = studentWork.nodeId;
                if (_nodeId2 === _this.nodeId && _this.workgroupsById[workgroupId]) {
                    // a workgroup has a new componentState for this node
                    _this.updateWorkgroup(workgroupId);
                }
            }
        });

        // save event when node grading view is displayed and save the nodeId that is displayed
        var context = "ClassroomMonitor",
            nodeId = this.nodeId,
            componentId = null,
            componentType = null,
            category = "Navigation",
            event = "nodeGradingViewDisplayed",
            data = { nodeId: this.nodeId };
        this.TeacherDataService.saveEvent(context, nodeId, componentId, componentType, category, event, data);
    }

    /**
     * Build the workgroupsById object
     */


    _createClass(NodeGradingController, [{
        key: 'setWorkgroupsById',
        value: function setWorkgroupsById() {
            var l = this.workgroups.length;
            for (var i = 0; i < l; i++) {
                var id = this.workgroups[i].workgroupId;
                this.workgroupsById[id] = this.workgroups[i];
                this.workVisibilityById[id] = false;

                this.updateWorkgroup(id, true);
            }
        }

        /**
         * Update statuses, scores, notifications, etc. for a workgroup object. Also check if we need to hide student
         * names because logged-in user does not have the right permissions
         * @param workgroupID a workgroup ID number
         * @param init Boolean whether we're in controller initialization or not
         */

    }, {
        key: 'updateWorkgroup',
        value: function updateWorkgroup(workgroupId, init) {
            var workgroup = this.workgroupsById[workgroupId];

            if (workgroup) {
                var alertNotifications = this.getAlertNotificationsByWorkgroupId(workgroupId);
                workgroup.hasAlert = alertNotifications.length;
                workgroup.hasNewAlert = this.workgroupHasNewAlert(alertNotifications);
                var completionStatus = this.getNodeCompletionStatusByWorkgroupId(workgroupId);
                workgroup.hasNewWork = completionStatus.hasNewWork;
                workgroup.isVisible = completionStatus.isVisible ? 1 : 0;
                workgroup.completionStatus = this.getWorkgroupCompletionStatus(completionStatus);
                workgroup.score = this.getNodeScoreByWorkgroupId(workgroupId);

                if (!this.canViewStudentNames) {
                    // TODO: i18n
                    workgroup.displayNames = 'Student ' + workgroupId;
                }

                if (!init) {
                    this.workgroupsById[workgroupId] = angular.copy(workgroup);
                }
            }
        }
    }, {
        key: 'getAlertNotificationsByWorkgroupId',
        value: function getAlertNotificationsByWorkgroupId(workgroupId) {
            var args = {};
            args.nodeId = this.nodeId;
            args.toWorkgroupId = workgroupId;
            return this.NotificationService.getAlertNotifications(args);
        }
    }, {
        key: 'workgroupHasNewAlert',
        value: function workgroupHasNewAlert(alertNotifications) {
            var newAlert = false;

            var l = alertNotifications.length;
            for (var i = 0; i < l; i++) {
                var alert = alertNotifications[i];
                if (!alert.timeDismissed) {
                    newAlert = true;
                    break;
                }
            }

            return newAlert;
        }

        /**
         * Returns an object with node completion status, latest work time, and latest annotation time
         * for a workgroup for the current node
         * @param workgroupId a workgroup ID number
         * @returns Object with completion, latest work time, latest annotation time
         */

    }, {
        key: 'getNodeCompletionStatusByWorkgroupId',
        value: function getNodeCompletionStatusByWorkgroupId(workgroupId) {
            var isCompleted = false;
            var isVisible = false;

            // TODO: store this info in the nodeStatus so we don't have to calculate every time?
            var latestWorkTime = this.getLatestWorkTimeByWorkgroupId(workgroupId);

            var latestAnnotationTime = this.getLatestAnnotationTimeByWorkgroupId(workgroupId);
            var studentStatus = this.StudentStatusService.getStudentStatusForWorkgroupId(workgroupId);
            if (studentStatus != null) {
                var nodeStatus = studentStatus.nodeStatuses[this.nodeId];
                if (nodeStatus) {
                    isVisible = nodeStatus.isVisible;
                    if (latestWorkTime) {
                        // workgroup has at least one componentState for this node, so check if node is completed
                        isCompleted = nodeStatus.isCompleted;
                    }

                    if (!this.ProjectService.nodeHasWork(this.nodeId)) {
                        // the step does not generate any work so completion = visited
                        isCompleted = nodeStatus.isVisited;
                    }
                }
            }

            return {
                isCompleted: isCompleted,
                isVisible: isVisible,
                latestWorkTime: latestWorkTime,
                latestAnnotationTime: latestAnnotationTime
            };
        }
    }, {
        key: 'getLatestWorkTimeByWorkgroupId',
        value: function getLatestWorkTimeByWorkgroupId(workgroupId) {
            var time = null;
            var componentStates = this.TeacherDataService.getComponentStatesByNodeId(this.nodeId);
            var n = componentStates.length - 1;

            // loop through component states for this node, starting with most recent
            for (var i = n; i > -1; i--) {
                var componentState = componentStates[i];
                if (componentState.workgroupId === workgroupId) {
                    // componentState is for given workgroupId
                    time = componentState.serverSaveTime;
                    break;
                }
            }

            return time;
        }
    }, {
        key: 'getLatestAnnotationTimeByWorkgroupId',
        value: function getLatestAnnotationTimeByWorkgroupId(workgroupId) {
            var time = null;
            var annotations = this.TeacherDataService.getAnnotationsByNodeId(this.nodeId);
            var n = annotations.length - 1;

            // loop through annotations for this node, starting with most recent
            for (var i = n; i > -1; i--) {
                var annotation = annotations[i];
                // TODO: support checking for annotations from shared teachers
                if (annotation.toWorkgroupId === workgroupId && annotation.fromWorkgroupId === this.ConfigService.getWorkgroupId()) {
                    time = annotation.serverSaveTime;
                    break;
                }
            }

            return time;
        }

        /**
         * Returns the score for the current node for a given workgroupID
         * @param workgroupId a workgroup ID number
         * @returns Number score value (defaults to -1 if workgroup has no score)
         */

    }, {
        key: 'getNodeScoreByWorkgroupId',
        value: function getNodeScoreByWorkgroupId(workgroupId) {
            var score = this.AnnotationService.getScore(workgroupId, this.nodeId);
            return typeof score === 'number' ? score : -1;
        }

        /**
         * Returns a numerical status value for a given completion status object depending on node completion
         * Available status values are: 0 (not visited/no work; default), 1 (partially completed), 2 (completed)
         * @param completionStatus Object
         * @returns Integer status value
         */

    }, {
        key: 'getWorkgroupCompletionStatus',
        value: function getWorkgroupCompletionStatus(completionStatus) {
            var hasWork = completionStatus.latestWorkTime !== null;
            var isCompleted = completionStatus.isCompleted;
            var isVisible = completionStatus.isVisible;

            // TODO: store this info in the nodeStatus so we don't have to calculate every time (and can use more widely)?
            var status = 0; // default

            if (!isVisible) {
                status = -1;
            } else if (isCompleted) {
                status = 2;
            } else if (hasWork) {
                status = 1;
            }

            return status;
        }

        /**
         * Get the student data for a specific part
         * @param the componentId
         * @param the workgroupId id of Workgroup who created the component state
         * @return the student data for the given component
         */

    }, {
        key: 'getLatestComponentStateByWorkgroupIdAndComponentId',
        value: function getLatestComponentStateByWorkgroupIdAndComponentId(workgroupId, componentId) {
            var componentState = null;

            if (workgroupId != null && componentId != null) {
                // get the latest component state for the component
                componentState = this.TeacherDataService.getLatestComponentStateByWorkgroupIdNodeIdAndComponentId(workgroupId, this.nodeId, componentId);
            }

            return componentState;
        }

        /**
         * Get the current period
         */

    }, {
        key: 'getCurrentPeriod',
        value: function getCurrentPeriod() {
            return this.TeacherDataService.getCurrentPeriod();
        }

        /**
         * Get the percentage of the class or period that has completed the node
         * @param nodeId the node id
         * @returns the percentage of the class or period that has completed the node
         */

    }, {
        key: 'getNodeCompletion',
        value: function getNodeCompletion(nodeId) {
            // get the currently selected period
            var currentPeriod = this.getCurrentPeriod();
            var periodId = currentPeriod.periodId;

            // get the percentage of the class or period that has completed the node
            var completionPercentage = this.StudentStatusService.getNodeCompletion(nodeId, periodId).completionPct;

            return completionPercentage;
        }

        /**
         * Get the average score for the node
         * @param nodeId the node id
         * @returns the average score for the node
         */

    }, {
        key: 'getNodeAverageScore',
        value: function getNodeAverageScore() {
            // get the currently selected period
            var currentPeriod = this.TeacherDataService.getCurrentPeriod();
            var periodId = currentPeriod.periodId;

            // get the average score for the node
            var averageScore = this.StudentStatusService.getNodeAverageScore(this.nodeId, periodId);

            if (averageScore === null) {
                averageScore = 'N/A';
            } else {
                averageScore = this.$filter('number')(averageScore, 1);
            }

            return averageScore;
        }

        /**
         * Checks whether a workgroup should be shown
         * @param workgroupId the workgroupId to look for
         * @returns boolean whether the workgroup should be shown
         */

    }, {
        key: 'isWorkgroupShown',
        value: function isWorkgroupShown(workgroupId) {
            var show = false;

            var currentPeriodId = this.getCurrentPeriod().periodId;
            var workgroup = this.workgroupsById[workgroupId];
            var periodId = workgroup.periodId;

            if (currentPeriodId === -1 || currentPeriodId === periodId) {
                // workgroup is in current period
                var currentWorkgroup = this.TeacherDataService.getCurrentWorkgroup();
                if (currentWorkgroup) {
                    // there is a currently selected workgroup, so check if this one matches
                    if (currentWorkgroup.workgroupId === parseInt(workgroupId)) {
                        // workgroupIds match, so show this one
                        show = true;
                    }
                } else {
                    // there is no currently selected workgroup, so show this one
                    show = true;
                }
            }

            return show;
        }
    }, {
        key: 'updateScroll',
        value: function updateScroll(target, viewportOffsetTop) {
            var newViewportOffsetTop = target.getBoundingClientRect().top;
            var delta = viewportOffsetTop - newViewportOffsetTop;
            var scrollTop = content.scrollTop;
            content.scrollTop = scrollTop - delta;
        }

        /**
         * Show the rubric in the grading view. We will show the step rubric and the
         * component rubrics.
         */

    }, {
        key: 'showRubric',
        value: function showRubric($event) {

            // get the step number and title
            var stepNumberAndTitle = this.ProjectService.getNodePositionAndTitleByNodeId(this.nodeId);
            var rubricTitle = this.$translate('STEP_INFO');

            /*
             * create the dialog header, actions, and content elements
             */
            var dialogHeader = '<md-toolbar>\n                <div class="md-toolbar-tools">\n                    <h2>' + stepNumberAndTitle + '</h2>\n                </div>\n            </md-toolbar>';

            var dialogActions = '<md-dialog-actions layout="row" layout-align="end center">\n                <md-button class="md-primary" ng-click="openInNewWindow()" aria-label="{{ \'openInNewWindow\' | translate }}">{{ \'openInNewWindow\' | translate }}</md-button>\n                <md-button class="md-primary" ng-click="close()" aria-label="{{ \'close\' | translate }}">{{ \'close\' | translate }}</md-button>\n            </md-dialog-actions>';

            var dialogContent = '<md-dialog-content class="gray-lighter-bg">\n                <div class="md-dialog-content" id="nodeInfo_' + this.nodeId + '">\n                    <node-info node-id="' + this.nodeId + '"></node-info>\n                </div>\n            </md-dialog-content>';

            // create the dialog string
            var dialogString = '<md-dialog class="dialog--wider" aria-label="' + stepNumberAndTitle + ' - ' + rubricTitle + '">' + dialogHeader + dialogContent + dialogActions + '</md-dialog>';
            var nodeId = this.nodeId;

            // display the rubric in a popup
            this.$mdDialog.show({
                template: dialogString,
                fullscreen: true,
                controller: ['$scope', '$mdDialog', function DialogController($scope, $mdDialog) {

                    // display the rubric in a new tab
                    $scope.openInNewWindow = function () {

                        // open a new tab
                        var w = window.open('', '_blank');

                        /*
                         * create the header for the new window that contains the project title
                         */
                        var windowHeader = '<md-toolbar class="layout-row">\n                                <div class="md-toolbar-tools primary-bg" style="color: #ffffff;">\n                                    <h2>' + stepNumberAndTitle + '</h2>\n                                </div>\n                            </md-toolbar>';

                        var rubricContent = document.getElementById('nodeInfo_' + nodeId).innerHTML;

                        // create the window string
                        var windowString = '<link rel=\'stylesheet\' href=\'../wise5/lib/bootstrap/css/bootstrap.min.css\' />\n                            <link rel=\'stylesheet\' href=\'../wise5/themes/default/style/monitor.css\'>\n                            <link rel=\'stylesheet\' href=\'../wise5/themes/default/style/angular-material.css\'>\n                            <link rel=\'stylesheet\' href=\'../wise5/lib/summernote/dist/summernote.css\' />\n                            <link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Roboto:300,400,500,700,400italic%7CMaterial+Icons" media="all">\n                            <body class="layout-column">\n                                <div class="layout-column">' + windowHeader + '<md-content class="md-padding">' + rubricContent + '</div></md-content></div>\n                            </body>';

                        // write the rubric content to the new tab
                        w.document.write(windowString);

                        // close the popup
                        $mdDialog.hide();
                    };

                    // close the popup
                    $scope.close = function () {
                        $mdDialog.hide();
                    };
                }],
                targetEvent: $event,
                clickOutsideToClose: true,
                escapeToClose: true
            });
        }
    }, {
        key: 'setSort',
        value: function setSort(value) {

            switch (value) {
                case 'team':
                    if (this.sort === 'team') {
                        this.sort = '-team';
                    } else {
                        this.sort = 'team';
                    }
                    break;
                case 'status':
                    if (this.sort === 'status') {
                        this.sort = '-status';
                    } else {
                        this.sort = 'status';
                    }
                    break;
                case 'score':
                    if (this.sort === 'score') {
                        this.sort = '-score';
                    } else {
                        this.sort = 'score';
                    }
                    break;
            }

            // update value in the teacher data service so we can persist across view instances and current node changes
            this.TeacherDataService.nodeGradingSort = this.sort;
        }
    }, {
        key: 'getOrderBy',
        value: function getOrderBy() {
            var orderBy = [];

            switch (this.sort) {
                case 'team':
                    orderBy = ['-isVisible', 'displayNames'];
                    break;
                case '-team':
                    orderBy = ['-isVisible', '-displayNames'];
                    break;
                case 'status':
                    orderBy = ['-isVisible', 'completionStatus', 'displayNames'];
                    break;
                case '-status':
                    orderBy = ['-isVisible', '-completionStatus', 'displayNames'];
                    break;
                case 'score':
                    orderBy = ['-isVisible', 'score', 'displayNames'];
                    break;
                case '-score':
                    orderBy = ['-isVisible', '-score', 'displayNames'];
                    break;
            }

            return orderBy;
        }

        /**
         * Expand all workgroups to show student work
         */

    }, {
        key: 'expandAll',
        value: function expandAll() {

            // loop through all the workgroups
            for (var i = 0; i < this.workgroups.length; i++) {

                // get a workgroup id
                var id = this.workgroups[i].workgroupId;

                // check if the workgroup is currently in view
                if (this.workgroupInViewById[id]) {
                    // the workgroup is currently in view so we will expand it
                    this.workVisibilityById[id] = true;
                }
            }

            /*
             * set the boolean flag to denote that we are currently expanding
             * all the workgroups
             */
            this.isExpandAll = true;
        }

        /**
         * Collapse all workgroups to hide student work
         */

    }, {
        key: 'collapseAll',
        value: function collapseAll() {
            var n = this.workgroups.length;

            for (var i = 0; i < n; i++) {
                var id = this.workgroups[i].workgroupId;
                this.workVisibilityById[id] = false;
            }

            /*
             * set the boolean flag to denote that we are not currently expanding
             * all the workgroups
             */
            this.isExpandAll = false;
        }
    }, {
        key: 'onUpdateExpand',
        value: function onUpdateExpand(workgroupId, value) {
            this.workVisibilityById[workgroupId] = value;
        }
    }, {
        key: 'onUpdateHiddenComponents',
        value: function onUpdateHiddenComponents(value) {
            this.hiddenComponents = angular.copy(value);
        }

        /**
         * A workgroup row has either come into view or gone out of view
         * @param workgroupId the workgroup id that has come into view or gone out
         * of view
         * @param inview whether the row is in view or not
         */

    }, {
        key: 'workgroupInView',
        value: function workgroupInView(workgroupId, inview) {

            // remember whether the workgroup is in view or not
            this.workgroupInViewById[workgroupId] = inview;

            if (this.isExpandAll) {
                // we are currently in expand all mode

                if (inview) {
                    // the workgroup row is in view so we will expand it
                    this.workVisibilityById[workgroupId] = true;
                }
            }
        }
    }]);

    return NodeGradingController;
}();

NodeGradingController.$inject = ['$filter', '$mdDialog', '$scope', '$stateParams', 'AnnotationService', 'ConfigService', 'NotificationService', 'ProjectService', 'StudentStatusService', 'TeacherDataService'];

exports.default = NodeGradingController;
//# sourceMappingURL=nodeGradingController.js.map
