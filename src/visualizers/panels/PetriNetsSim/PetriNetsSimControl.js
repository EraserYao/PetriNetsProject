/*globals define, WebGMEGlobal*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Fri Dec 06 2022 01:42:49 GMT-0600 (Central Standard Time).
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames'
], function (
    CONSTANTS,
    GMEConcepts,
    nodePropertyNames
) {

    'use strict';

    function PetriNetsSimControl(options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;
        this._currentNodeParentId = undefined;
        this.hasNextSteps = null;

        this._initWidgetEventHandlers();

        this._logger.debug('ctor finished');
        

    }

    PetriNetsSimControl.prototype._initWidgetEventHandlers = function () {
        this._widget.onNodeClick = function (id) {
            // Change the current active object
            WebGMEGlobal.State.registerActiveObject(id);
        };
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    // One major concept here is with managing the territory. The territory
    // defines the parts of the project that the visualizer is interested in
    // (this allows the browser to then only load those relevant parts).
    PetriNetsSimControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            self = this;

        self._logger.debug('activeObject nodeId \'' + nodeId + '\'');

        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
        }

        self._currentNodeId = nodeId;
        self._currentNodeParentId = undefined;

        if (typeof self._currentNodeId === "string") {
            // Put new node's info into territory rules
            self._selfPatterns = {};
            self._selfPatterns[nodeId] = { children: 1 }; // Territory "rule"
      
            self._territoryId = self._client.addUI(self, function (events) {
              self._eventCallback(events);
            });
      
            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
          }
    };

    // This next function retrieves the relevant node information for the widget
    PetriNetsSimControl.prototype._getObjectDescriptor = function (nodeId) {
        var node = this._client.getNode(nodeId),
            objDescriptor;
        if (node) {
            objDescriptor = {
                id: node.getId(),
                name: node.getAttribute(nodePropertyNames.Attributes.name),
                childrenIds: node.getChildrenIds(),
                parentId: node.getParentId(),
                isConnection: GMEConcepts.isConnection(nodeId)
            };
        }

        return objDescriptor;
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    PetriNetsSimControl.prototype._eventCallback = function (events) {
        const self = this;
        self._initPetriNet();
    };

    PetriNetsSimControl.prototype._initPetriNet = function () {
        const self = this;
        const nodes = this._client.getAllMetaNodes();
        let META = {};
        nodes.forEach((node) => {
            META[node.getAttribute("name")] = node.getId();
        });
        let elementNodes = this._client.getNode(this._currentNodeId).getChildrenIds();
        let placeIds = getPlacesIds(this._client, elementNodes);
        let transIds = getTransitionsIds(this._client, elementNodes);
        let petriNet = {};
        let arcsTransToPlace = getArcs(
            self._client,
            "ArcTransToPlace",
            elementNodes
        );
        let arcsPlaceToTrans = getArcs(
            self._client,
            "ArcPlaceToTrans",
            elementNodes
        );
        let inputMatrix = getInputMatrix(
            placeIds,
            transIds,
            arcsTransToPlace
        );
        let startId = getStartingPlaceId(inputMatrix);
        let outputMatrix = getOutputMatrix(
            placeIds,
            transIds,
            arcsPlaceToTrans
        );
        //TODO
    };

    PetriNetsSimControl.prototype._onLoad = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        this._widget.addNode(description);
    };

    PetriNetsSimControl.prototype._onUpdate = function (gmeId) {
        var description = this._getObjectDescriptor(gmeId);
        this._widget.updateNode(description);
    };

    PetriNetsSimControl.prototype._onUnload = function (gmeId) {
        this._widget.removeNode(gmeId);
    };

    PetriNetsSimControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    PetriNetsSimControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    PetriNetsSimControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    PetriNetsSimControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    PetriNetsSimControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {suppressVisualizerFromNode: true});
        }
    };

    PetriNetsSimControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    PetriNetsSimControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            if (this.hasNextSteps === null || this.hasNextSteps.length == 0) {
                this.$btnEventSelector.hide();
                this.$deadlockLabel.show();
                this.$btnResetSimulator.show();
            } else {
                this.$btnEventSelector.show();
                this.$deadlockLabel.hide();
                this.$btnResetSimulator.show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    PetriNetsSimControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    PetriNetsSimControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    PetriNetsSimControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        /************** Go to hierarchical parent button ****************/
        self.$PluginClassifier = toolBar.addButton({
            text: "Classify",
            title: 'Classify',
            icon: 'glyphicon glyphicon-circle-arrow-up',
            clickFn: function (/*data*/) {
                const context = self._client.getCurrentPluginContext(
                    "ClassifierPlugin",
                    self._currentNodeId,
                    []
                  );
                  // !!! it is important to fill out or pass an empty object as the plugin config otherwise we might get errors...
                  context.pluginConfig = {};
                  self._client.runServerPlugin(
                    "ClassifierPlugin",
                    context,
                    function (err, result) {
                      // here comes any additional processing of results or potential errors.
                      console.log("plugin err:", err);
                      console.log("plugin result:", result);
                    }
                  );
            }
        });
        self._toolbarItems.push(this.$PluginClassifier);

        self.$btnResetSimulator = toolBar.addButton({
            title: "Reset simulator",
            text: "Reset simulator  ",
            icon: "glyphicon glyphicon-fast-backward",
            clickFn: function (/*data*/) {
              self._widget.resetSimulator();
            },
          });
        self._toolbarItems.push(self.$btnResetSimulator);
        
        self.$btnEventSelector = toolBar.addDropDownButton({
            text: "Fire a specific enabled transition  ",
            title: "Fire a specific enabled transition",
            icon: "glyphicon glyphicon-play",
          });
          self._toolbarItems.push(self.$btnEventSelector);
        self.$btnEventSelector.hide();

        // play button for firing ALL enabled transitions
        self.$deadlockLabel = toolBar.addLabel();
        self.$deadlockLabel.text("DEADLOCK");
        self._toolbarItems.push(self.$deadlockLabel);
        self.$deadlockLabel.hide();

        this._toolbarInitialized = true;
    };

    return PetriNetsSimControl;
});

/* Util function reference: https://github.com/austinjhunt/petrinet-webgme-designstudio.git */
/*********** UTILITY FUNCTIONS *************/
let getMetaName = (client, node) => {
  let metaTypeId = node.getMetaTypeId();
  return client.getNode(metaTypeId).getAttribute("name");
};

let getArcs = (client, metaName, elementIds) => {
  // metaName = 'ArcPlaceToTransition' or 'ArcTransitionToPlace'
  let arcs = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === metaName) {
      arcs.push({
        id: id,
        name: node.getAttribute("name"),
        src: getArcPointerNodeId(node, "src"),
        dst: getArcPointerNodeId(node, "dst"),
      });
    }
  });
  return arcs;
};

let _petriNetInDeadlock = (petriNet) => {
  /*
    return true if there is no enabled transition, where a
    transition is enabled if for all inplaces of the transition
    the amount of tokens at the place is nonzero.

    So return true if for all transitions t_i,
      for all inplaces in_p of t_i,
        in_p.currentMarking is <= 0 (really min is 0 but will use <=)
  */
  return Object.keys(petriNet.transitions).every((transId) => {
    getInPlacesToTransition(transId, petriNet.outputMatrix).every(
      (inPlaceId) => {
        parseInt(petriNet.places[inPlaceId].currentMarking) <= 0;
      }
    );
  });
};

let transitionIsEnabled = (client, transitionId, outputMatrix) => {
  /* return true if transition is enabled, false otherwise
  transition is ???enabled for all ???inplaces ???of the transition
  (that are connected to the transition via an
  incoming arc) the amount of tokens at the place is non zero
  */
  return getInPlacesToTransition(transitionId, outputMatrix).every(
    (inPlaceId) => {
      let marking = parseInt(
        client.getNode(inPlaceId).getAttribute("currentMarking")
      );
      return marking > 0;
    }
  );
};

let getPlacesIds = (client, elementIds) => {
  // get the ids of places from the children
  let places = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === "Place") {
      places.push(id);
    }
  });
  return places;
};

let getTransitionsIds = (client, elementIds) => {
  // get the ids of transitions from the children
  let transitions = [];
  elementIds.forEach((id, i) => {
    let node = client.getNode(id);
    if (getMetaName(client, node) === "Transition") {
      transitions.push(id);
    }
  });
  return transitions;
};

let getOutputMatrix = (placeIds, transitionIds, arcsPlaceToTransition) => {
  // build object representing out flow from each place to each transition {'place1': {'trans1id': 0, 'trans2id': 1, 'trans3id': 0}, ...}
  let outputMatrix = {};
  placeIds.forEach((pid, i) => {
    outputMatrix[pid] = {};
    transitionIds.forEach((tid, j) => {
      outputMatrix[pid][tid] = getOutFlowFromPlaceToTransition(
        pid,
        tid,
        arcsPlaceToTransition
      );
    });
  });
  return outputMatrix;
};

let getInputMatrix = (placeIds, transitionIds, arcsTransitionToPlace) => {
  // build object representing in flow to each place from each transition e.g. {'place1': {'trans1id': 0, 'trans2id': 1, 'trans3id': 0}, ...}
  let inputMatrix = {};
  placeIds.forEach((pid, i) => {
    inputMatrix[pid] = {};
    transitionIds.forEach((tid, j) => {
      inputMatrix[pid][tid] = getInFlowToPlaceFromTransition(
        pid,
        tid,
        arcsTransitionToPlace
      );
    });
  });
  return inputMatrix;
};

let getArcPointerNodeId = (arc, pointerName) => {
  // return id of node being pointed at where pointerName is either 'src' or 'dst'
  return arc.getPointerId(pointerName);
};
let getOutFlowFromPlaceToTransition = (
  placeId,
  transitionId,
  arcsPlaceToTransition
) => {
  // return true if arc from placeId to transitionId else false
  return arcsPlaceToTransition.some((arc, index) => {
    return arc.src === placeId && arc.dst === transitionId;
  });
};
let getInFlowToPlaceFromTransition = (
  placeId,
  transitionId,
  arcsTransitionToPlace
) => {
  // return true if arc to placeId from transitionId else false
  return arcsTransitionToPlace.some((arc, index) => {
    return arc.src === transitionId && arc.dst === placeId;
  });
};
let placeHasNoFlow = (matrix, placeId) => {
  // obj is either input or output matrix
  // return true if all of the values for the corresponding transitions are false
  return Object.entries(matrix[placeId]).every((arr) => {
    return !arr[1];
  });
};

let getStartingPlaceId = (inputMatrix) => {
  // the first place is the place with no in flow and only out flow.
  for (const placeId in inputMatrix) {
    if (placeHasNoFlow(inputMatrix, placeId)) {
      return placeId;
    }
  }
  // if there is no place with no inflow, then use any of the places as starting point
  for (const placeId in inputMatrix) {
    return placeId;
  }
};

let getNextPlacesFromCurrentPlace = (
  placeId,
  arcsPlaceToTransition,
  arcsTransitionToPlace
) => {
  let nextPlaces = [];
  let outFlowArcs = arcsPlaceToTransition.filter((arc) => arc.src === placeId);
  outFlowArcs.forEach((arc_p2t) => {
    nextPlaces.push(
      ...arcsTransitionToPlace
        .filter((arc_t2p) => arc_t2p.src === arc_p2t.dst)
        .map((arc_t2p) => {
          // do not include already traversed in case of loops
          if (arc_t2p.src === arc_p2t.dst) {
            return arc_t2p.dst;
          }
        })
    );
  });
  return nextPlaces;
};

let getOutTransitionsFromPlace = (placeId, outputMatrix) => {
  return Object.keys(outputMatrix[placeId]).filter(
    (transId) => outputMatrix[placeId][transId]
  );
};
let getInTransitionsToPlace = (placeId, inputMatrix) => {
  return Object.keys(inputMatrix[placeId]).filter(
    (transId) => inputMatrix[placeId][transId]
  );
};
let getInPlacesToTransition = (transId, outputMatrix) => {
  return Object.keys(outputMatrix).filter(
    (placeId) => outputMatrix[placeId][transId]
  );
};
let getOutPlacesFromTransition = (transId, inputMatrix) => {
  return Object.keys(inputMatrix).filter(
    (placeId) => inputMatrix[placeId][transId]
  );
};

let getOutArcsFromPlace = (placeId, arcsPlaceToTransition) => {
  return arcsPlaceToTransition.filter((arc) => arc.src === placeId);
};
let getOutArcsFromTransition = (transitionId, arcsTransitionToPlace) => {
  return arcsTransitionToPlace.filter((arc) => arc.src === transitionId);
};
/*********** END UTILITY FUNCTIONS *************/