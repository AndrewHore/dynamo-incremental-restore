'use strict';

var mockery = require('mockery');
var should = require('should');
var sinon = require('sinon');

describe('DynamoDb Incremental backups restore', function() {

    var dynamoIncrementalRestore = require('../');
    before(function() {
        var aws = require('aws-sdk');
        var awsMock = require('./aws-mock.js');
        var testData = require('./test-data.json');

        mockery.enable();
        sinon.stub(aws, 'S3', function() {
            return {
                listObjectVersions: function(params, cb) {
                    cb(false, testData);
                }
            };
        });

        mockery.registerMock('aws-sdk', aws);
    });

    after(function() {
        mockery.disable();
    });

    describe('Latest version restore', function() {

        var promise;
        before(function() {
            promise = dynamoIncrementalRestore();
        });

        it('Should execute three documents', function(done) {
            promise
                .then(function(data) {
                    Object.keys(data).should.have.length(4);
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });

        it('Should execute the correct documents', function(done) {
            promise
                .then(function(data) {
                    data.should.have.properties('originalRecord');
                    data.should.have.properties('updatedRecord');
                    data.should.have.properties('restoredRecord');
                    data.should.have.properties('deletedRecord');
                    done();
                })
                .catch(function(err) {
                    done(err);
                });
        });

    });

    describe('Point in time restore', function() {

        describe('Deleted Record', function() {
            it('Should delete \'deletedRecord\' row after it was deleted', function(done) {
                var pointInTime = new Date("2016-03-29T23:56:55.000Z");
                dynamoIncrementalRestore(pointInTime)
                    .then(function(data) {
                        data.should.have.properties('deletedRecord');
                        data['deletedRecord'].deletedMarker.should.be.true;
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });

            it('Should create \'deletedRecord\' row after it was created', function(done) {
                var pointInTime = new Date("2016-03-28T23:56:40.000Z");
                dynamoIncrementalRestore(pointInTime)
                    .then(function(data) {
                        data.should.have.properties('deletedRecord');
                        should.not.exist(data['deletedRecord'].deletedMarker);
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });
        });

        describe('Original Record', function() {
            it('Should delete original record before it existed', function(done) {
                var pointInTime = new Date("2016-03-20T23:51:02.000Z");
                dynamoIncrementalRestore(pointInTime)
                    .then(function(data) {
                        data.should.have.properties('originalRecord');
                        data['originalRecord'].deletedMarker.should.be.true;
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });

            it('Should create \'originalRecord\' row after it was created', function(done) {
                var pointInTime = new Date("2016-04-01T23:51:02.000Z");
                dynamoIncrementalRestore(pointInTime)
                    .then(function(data) {
                        data.should.have.properties('originalRecord');
                        should.not.exist(data['originalRecord'].deletedMarker);
                        done();
                    })
                    .catch(function(err) {
                        done(err);
                    });
            });
        });


    });

});
