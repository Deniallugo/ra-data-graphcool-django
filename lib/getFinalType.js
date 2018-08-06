'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _graphql = require('graphql');

/**
 * Ensure we get the real type even if the root type is NON_NULL or LIST
 * @param {GraphQLType} type
 */
var getFinalType = function getFinalType(type) {
    if (type.kind === _graphql.TypeKind.NON_NULL || type.kind === _graphql.TypeKind.LIST) {
        return getFinalType(type.ofType);
    }

    return type;
};

exports.default = getFinalType;
module.exports = exports['default'];