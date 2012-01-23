﻿// editable extender and ko.editable plugin for viewModels
// (c) Roman Gomolko - rgomolko@gmail.com
// License: MIT (http://www.opensource.org/licenses/mit-license.php)

/*
Exports: 
    ko.extenders.editable: ko.observable().extend({editable: true|false});
    ko.editable: ko.editable(objectWithObservables, boolean autoInit);

    Editable adds following methods into observables and objects:
        - beginEdit()
        - commit()
        - rollback()
        - hasChanges() - observable
*/

(function (ko, undefined) {
    var deferredDependentObservable = function (readFunction) {
        return ko.dependentObservable({ read: readFunction, deferEvaluation: true });
    };

    ko.extenders['editable'] = function (target, enabledEditable) {
        enabledEditable = enabledEditable === undefined ? true : enabledEditable;
        // Protect from double initialization
        if (target.hasOwnProperty('editable')) {
            return target;
        }
        target.editable = enabledEditable;

        var oldValue;
        var inTransaction = ko.observable(false);

        target.beginEdit = function () {
            var currentValue = target();
            if (currentValue instanceof Array) {
                currentValue = currentValue.slice(); // make copy
            }
            oldValue = currentValue;
            inTransaction(true);
        };

        target.commit = function () {
            inTransaction(false);
        };

        target.rollback = function () {
            if (inTransaction()) {
                target(oldValue);
				inTransaction(false);
            }
        };

        target.hasChanges = deferredDependentObservable(function () {
            var hasChanges = inTransaction() && oldValue != target();
            return hasChanges;
        });

        return target;
    };

    ko.editable = function (viewModel, autoInit) {
        if (typeof (viewModel.beginEdit) == 'function') {
            return;
        }

        autoInit = autoInit === undefined ? true : autoInit;
        var editables = ko.observableArray();

        viewModel.beginEdit = function () {
            ko.utils.arrayForEach(editables(), function (obj) {
                obj.beginEdit();
            });
        };

        viewModel.commit = function () {
            ko.utils.arrayForEach(editables(), function (obj) {
                obj.commit();
            });
        };

        viewModel.rollback = function () {
            ko.utils.arrayForEach(editables(), function (obj) {
                obj.rollback();
            });
        };

        viewModel.addEditable = function (editable) {
            editables.push(editable.extend({ editable: true }));
        };

        viewModel.hasChanges = deferredDependentObservable(function () {
            var editableWithChanges = ko.utils.arrayFirst(editables(), function (editable) {
                return editable.hasChanges();
            });
            return editableWithChanges != null;
        });

        if (autoInit) {
            (function makeEditable(rootObject) {
                for (var propertyName in rootObject) {
                    var property = rootObject[propertyName];
                    if (ko.isWriteableObservable(property)) {
                        var observable = property;
                        observable.extend({ editable: true });
                        // Allow to skip observables extended with { editable: false } arguments
                        if (observable.editable) {
                            editables.push(observable);
                        }
                    }
                    property = ko.utils.unwrapObservable(property);
                    if (typeof (property) == 'object') {
                        makeEditable(property);
                    }
                }
            })(viewModel);
        }
    };
})(ko);