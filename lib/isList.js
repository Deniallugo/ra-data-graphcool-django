'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

var isList = function isList(type) {
    if (type.kind === _graphql.TypeKind.NON_NULL) {
        return isList(type.ofType);
    }

    return type.kind === _graphql.TypeKind.LIST;
};

exports.default = isList;
module.exports = exports['default'];