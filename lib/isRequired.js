'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

var isRequired = function isRequired(type) {
    if (type.kind === _graphql.TypeKind.LIST) {
        return isRequired(type.ofType);
    }

    return type.kind === _graphql.TypeKind.NON_NULL;
};

exports.default = isRequired;
module.exports = exports['default'];