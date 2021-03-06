/*
 *  Copyright 2013 Intel Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var db = require('ripple/db'),
    app = require('ripple/app'),
    event = require('ripple/event'),
    utils = require('ripple/utils'),
    errorcode = require('ripple/platform/tizen/2.0/errorcode'),
    t = require('ripple/platform/tizen/2.0/typecast'),
    WebAPIError = require('ripple/platform/tizen/2.0/WebAPIError'),
    WebAPIException = require('ripple/platform/tizen/2.0/WebAPIException'),
    PackageInformation = require('ripple/platform/tizen/2.0/PackageInformation'),
    _security = {
        "http://tizen.org/privilege/packagemanager.install": ["install", "uninstall"],
        "http://tizen.org/privilege/package.info": ["getPackagesInfo", "getPackageInfo",
                    "setPackageInfoEventListener", "unsetPackageInfoEventListener"]
    },
    DB_PACKAGE_KEY = "tizen-db-package",
    _listeners = [],
    _data = {
        packageList: {},
        installedList: {}
    },
    INTERVAL = 1000, // INTERVAL = 1sec
    INSTALL_AMOUNT = 3072, // installation speed amount = 3072 (KB/sec)
    PSEUDO_PACKAGE_ID = "pseudopack00",
    PSEUDO_APP_ID = "pseudoapp00",
    _self;

function _get() {
    _data = db.retrieveObject(DB_PACKAGE_KEY);
}

function _save() {
    db.saveObject(DB_PACKAGE_KEY, _data);
}

function _exec(callback, name, id, arg1) {
    switch (name) {
    case "onprogress":
        callback[name](id, arg1);
        break;
    case "oncomplete":
        callback[name](id);
        break;
    default:
        break;
    }
}

function _setupCurrentPackage() {
    var info, id, item, tizenAppId;
    info = app.getInfo();
    tizenAppId = info.tizenAppId || PSEUDO_APP_ID;
    id = info.tizenPackageId;
    if (id !== undefined) {
        if (_data.installedList[id]) {
            // already installed
            return;
        }

        item = null;
        utils.forEach(_data.packageList, function (p) {
            if (p.id === id) {
                item = p;
            }
        });

        if (item) {
            _data.installedList[item.id] = new PackageInformation(
                item.id, item.name, item.iconPath, item.version,
                item.totalSize, item.dataSize, new Date(),
                item.author, item.description, item.appIds
            );
            event.trigger("install-current-package", [_data.installedList[item.id]]);
        } else {
            _data.installedList[id] = new PackageInformation(
                id, "Tizen pseudo package", "icon.png", "2.2",
                8264, 50, new Date(),
                "TizenDev", "This is a description which is used in tests.", [tizenAppId]
            );
            event.trigger("install-current-package", [_data.installedList[id]]);
        }
    } else {
        _data.installedList[PSEUDO_PACKAGE_ID] = new PackageInformation(
            PSEUDO_PACKAGE_ID, "Tizen pseudo package", "icon.png", "2.2",
            8264, 50, new Date(),
            "TizenDev", "This is a description which is used in tests.", [tizenAppId]
        );
        event.trigger("install-current-package", [_data.installedList[PSEUDO_PACKAGE_ID]]);
    }
}

function _updatePackage(path, updateFlag) {
    var item, p, info;

    if (!_data.packageList[path]) {
        return;
    }
    _get();
    p = _data.packageList[path];
    item = _data.installedList[p.id];
    utils.forEach(_listeners, function (listener) {
        info = new PackageInformation(
            item.id, item.name, item.iconPath, item.version,
            item.totalSize, item.dataSize, item.lastModified,
            item.author, item.description, item.appIds);
        if (!updateFlag) {
            listener.oninstalled(info);
        } else {
            listener.onupdated(info);
        }
    });
}

function _initialize() {
    _get();

    if (!_data)
        return;

    utils.forEach(_data.installedList, function (item) {
        item.lastModified = new Date(item.lastModified);
    });

    _setupCurrentPackage();

    event.on("install-packge", function (path) {
        _updatePackage(path, false);
    });
    event.on("update-package", function (path) {
        _updatePackage(path, true);
    });

    event.on("uninstall-package", function (id) {
        _get();
        utils.forEach(_listeners, function (listener) {
            listener.onuninstalled(id);
        });
    });
}

_self = function () {
    var package;

    // public
    function install(path, progressCallback, errorCallback) {
        if (!_security.install) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        t.PackageManager("install", arguments);

        window.setTimeout(function () {
            var intervalId, installedSize = 0, packageSize, updateFlag = false,
                item, info, progress;

            if (!_data.packageList[path]) {
                if (errorCallback) {
                    errorCallback(new WebAPIError(errorcode.NOT_FOUND_ERR));
                }
                return;
            }
            item = _data.packageList[path];
            if (_data.installedList[item.id]) {
                updateFlag = true;
            }
            packageSize = item.totalSize;
            intervalId = setInterval(function () {
                if (installedSize >= packageSize) {
                    // Install complete
                    _data.installedList[item.id] = new PackageInformation(
                        item.id, item.name, item.iconPath, item.version,
                        item.totalSize, item.dataSize, new Date(),
                        item.author, item.description, item.appIds
                    );
                    event.trigger("install-apps", [item.appIds]);
                    _save();
                    _exec(progressCallback, "oncomplete", item.id);
                    clearInterval(intervalId);
                    item = _data.installedList[item.id];
                    utils.forEach(_listeners, function (listener) {
                        info = new PackageInformation(
                            item.id, item.name, item.iconPath, item.version,
                            item.totalSize, item.dataSize, item.lastModified,
                            item.author, item.description, item.appIds);
                        if (!updateFlag) {
                            listener.oninstalled(info);
                        } else {
                            listener.onupdated(info);
                        }
                    });
                    event.trigger("installedList-updated");
                } else {
                    installedSize += INSTALL_AMOUNT;
                    progress = (installedSize > packageSize) ? 100 :
                            Math.floor(installedSize * 100 / packageSize);
                    _exec(progressCallback, "onprogress", item.id, progress);
                }
            }, INTERVAL);
        }, 1);
    }

    function uninstall(id, progressCallback, errorCallback) {
        if (!_security.uninstall) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        t.PackageManager("uninstall", arguments);

        window.setTimeout(function () {
            var intervalId, removedSize = 0, packageSize, item, progress;

            if (!_data.installedList[id]) {
                if (errorCallback) {
                    errorCallback(new WebAPIError(errorcode.NOT_FOUND_ERR));
                }
                return;
            }
            item = _data.installedList[id];
            packageSize = item.totalSize;
            intervalId = setInterval(function () {
                if (removedSize >= packageSize) {
                    utils.forEach(_data.packageList, function (package) {
                        if (package.id === id) {
                            event.trigger("remove-apps", [package.appIds]);
                        }
                    });
                    delete _data.installedList[item.id];
                    _save();
                    _exec(progressCallback, "oncomplete", item.id);
                    clearInterval(intervalId);
                    item = _data.installedList[item.id];
                    utils.forEach(_listeners, function (listener) {
                        listener.onuninstalled(id);
                    });
                    event.trigger("installedList-updated");
                } else {
                    removedSize += INSTALL_AMOUNT * 10;
                    progress = (removedSize > packageSize) ? 100 :
                            Math.floor(removedSize * 100 / packageSize);
                    _exec(progressCallback, "onprogress", item.id, progress);
                }
            }, INTERVAL);
        }, 1);
    }

    function getPackagesInfo(successCallback, errorCallback) {
        if (!_security.getPackagesInfo) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        t.PackageManager("getPackagesInfo", arguments);

        window.setTimeout(function () {
            var packageArray = [];

            utils.forEach(_data.installedList, function (item) {
                var i;
                i = new PackageInformation(
                        item.id, item.name, item.iconPath, item.version,
                        item.totalSize, item.dataSize, item.lastModified,
                        item.author, item.description, item.appIds
                    );
                packageArray.push(i);
            });
            successCallback(packageArray);
        }, 1);
    }

    function getPackageInfo(id) {
        var p, item;

        if (!_security.getPackageInfo) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        t.PackageManager("getPackageInfo", arguments);

        id = id || "api1pack00";

        if (!_data.installedList[id]) {
            throw new WebAPIException(errorcode.NOT_FOUND_ERR);
        }
        item = _data.installedList[id];
        p = new PackageInformation(item.id, item.name, item.iconPath,
                item.version, item.totalSize, item.dataSize, item.lastModified,
                item.author, item.description, item.appIds);

        return p;
    }

    function setPackageInfoEventListener(eventCallback) {
        if (!_security.setPackageInfoEventListener) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        t.PackageManager("setPackageInfoEventListener", arguments);

        _listeners.push(eventCallback);
    }

    function unsetPackageInfoEventListener() {
        if (!_security.unsetPackageInfoEventListener) {
            throw new WebAPIException(errorcode.SECURITY_ERR);
        }

        t.PackageManager("unsetPackageInfoEventListener", arguments);

        _listeners = [];
    }

    function handleSubFeatures(subFeatures) {
        var i, subFeature;

        for (subFeature in subFeatures) {
            for (i in _security[subFeature]) {
                _security[_security[subFeature][i]] = true;
            }
        }
    }

    package = {
        install:                       install,
        uninstall:                     uninstall,
        getPackagesInfo:               getPackagesInfo,
        getPackageInfo:                getPackageInfo,
        setPackageInfoEventListener:   setPackageInfoEventListener,
        unsetPackageInfoEventListener: unsetPackageInfoEventListener,
        handleSubFeatures:             handleSubFeatures
    };

    return package;
};

_initialize();

module.exports = _self;
