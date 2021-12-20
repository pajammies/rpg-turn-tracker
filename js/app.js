//
// Universal variables
//
const socket = io();

//
// Turn Tracker variables
//
var disableDraggable = false;
var noSelect = true;
var initiative = '';
var items = [];
var numCombatants = items.length;
var characterCreated = false;
var myCharNames = [];
var myTurnModal = false;
var onDeckModal = false;
var claimText = [];
var combatActive = false;
var timerVisible = false;
var initialTurn = true;
var showApp = false;

//
// Room assignment variables
//
let roomCode = '';
let codeGenerated = false;
let showLanding = true;




var app = new Vue({
    el: '#app',
    data: {
        noSelect,
        disableDraggable,
        name,
        initiative,
        myArray: [],
        characterCreated,
        myCharNames,
        myTurnModal,
        onDeckModal,
        claimText,
        combatActive,
        elapsedTime: 0,
        timer: undefined,
        timerVisible,
        initialTurn,
        items,
        // Room generation
        roomCode,
        codeGenerated,
        showLanding
    },
    computed: {
        numCombatants: function() {
            return this.items.length;
        },
        modalText: function() {
            if (this.myTurnModal) {
                return "It's your turn!";
            } else if (this.onDeckModal) {
                return "You're on deck!";
            } else { return 'placeholder'; }
        },
        formattedElapsedTime() {
            const date = new Date(null);
            date.setSeconds(this.elapsedTime / 1000);
            const utc = date.toUTCString();
            return utc.substr(utc.indexOf(":") + 1, 5);
        },
        combatButtonText: function(evt) {
            if (this.combatActive) {
                return "END ENCOUNTER";
            } else {
                return "START ENCOUNTER";
            }
        }
    },
    created() {
        socket.on('items-changed', (data) => {
            app.items = data;

            for (let x = 0; x < app.items.length; x++) {
                if (app.items[x].currentTurn) {
                    app.combatActive = true;
                }
            }
        });

        socket.on('timer-initialize', () => {
            app.timerInitialize();
            app.initialTurn = false;
        });

        socket.on('new-user', () => {
            socket.emit('items-changed', app.items);
        });

        socket.on('modalShowHide', () => {
            modalShow(app.items, app.numCombatants, app.myCharNames);
        });

        socket.on('stop-timer', () => {
            app.stop();
            app.reset();
            app.combatActive = false;
            app.timerVisible = false;
        });

        socket.on('room-not-found', () => {
            alert('Could not find room, please try again!');
        });

        socket.on('found-room', () => {
            app.showLanding = false;
        })
    },
    methods: {
        addCharacter: function (name, initiative) {
            var init;
            var valid = true;

            if (initiative) {
                init = initiative;
            } else { init = 0; }

            for (let x = 0; x < app.items.length; x++) {
                if (app.items[x].character == name) {
                    valid = false;
                }
            }

            if (!valid) {
                alert('ERROR: Character must have a unique name.');
            }
            else {
                app.items.push({
                    character: name,
                    initiative: init,
                    dragOrder: '',
                    disabled: true,
                    currentTurn: false,
                    nextTurn: false
                });
                app.claimText.push('CLAIM');
                app.name = '';
                app.initiative = '';

                socket.emit('items-changed', app.items);

                //endCombat();
            }
        },
        enableInput: function (input) {
            input.disabled = false;
            app.disableDraggable = true;
            app.noSelect = false;
        },
        submitChanges: function () {
            app.disableDraggable = false;
            app.noSelect = true;
            for (let x = 0; x < app.items.length; x++) {
                app.items[x].disabled = true;
            }

            socket.emit('items-changed', app.items);
        },
        sort: function () {

            var tempArray = app.items.sort(function (a, b) {
                var x = a.initiative*1 > b.initiative*1? -1:1;
                return x;
            });

            app.items = tempArray;

            //endCombat();

            socket.emit('items-changed', app.items);
        },
        deleteItem: function(item) {
            var itemId = app.items.indexOf(item);

            for (let x = 0; x < app.myCharNames.length; x++) {
                if (app.myCharNames[x] == app.items[itemId].character) {
                    app.myCharNames.splice(x, 1);
                }
            }

            if (itemId > -1) {
                app.items.splice(itemId, 1);
            }

            //endCombat();

            socket.emit('items-changed', app.items);
        },
        clear: function() {
            for (let y = 0; y < app.items.length; y++) {
                app.items[y].initiative = '';
                app.items[y].nextTurn = false;
                app.items[y].currentTurn = false;
            }

            endCombat();

            socket.emit('items-changed', app.items);
        },
        nextTurnAction: function() {

            if (app.initialTurn) {
                socket.emit('timer-initialize');
                app.timerVisible = true;
                app.stop();
                app.reset();
                app.start();

                app.initialTurn = false;
            }
            else {

                for (let x = 0; x < app.numCombatants; x++) {
                    if (app.items[x].currentTurn) {
                        if (app.numCombatants - (x + 1) == 0) { //last person's turn
                            app.items[x].currentTurn = false;
                            app.items[0].nextTurn = false;

                            app.items[0].currentTurn = true;
                            app.items[1].nextTurn = true;
                        } else if (app.numCombatants - (x + 2) == 0) { //second-to-last person's turn
                            app.items[x].currentTurn = false;
                            app.items[x + 1].nextTurn = false;

                            app.items[x + 1].currentTurn = true;
                            app.items[0].nextTurn = true;
                        } else {
                            app.items[x].currentTurn = false;
                            app.items[x + 1].nextTurn = false;

                            app.items[x + 1].currentTurn = true;
                            app.items[x + 2].nextTurn = true;
                        }
                        socket.emit('items-changed', app.items);
                        socket.emit('modalShowHide');
                        break;
                    }
                }
                socket.emit('timer-initialize');
                app.stop();
                app.reset();
                app.start();

                if (app.myCharNames.length > 0) {
                    modalShow(app.items, app.numCombatants, app.myCharNames);
                }
            }
        },
        myChar: function(name) {
            app.myCharName = name;
            app.characterCreated = true;
        },
        startCombat: function() {
            if (app.numCombatants < 2) {
                alert("Need more than 2 combatants!");
            } else if (!app.combatActive) {
                app.combatActive = true;
                for (let x = 0; x < app.numCombatants; x++) {
                    app.items[x].currentTurn = false;
                    app.items[x].nextTurn = false;
                }
                app.items[0].currentTurn = true;
                app.items[1].nextTurn = true;
            } else {
                endCombat();
                app.stop();
                app.reset();
                app.timerVisible = false;
            }
            socket.emit('items-changed', app.items);
            socket.emit('modalShowHide');
            modalShow(app.items, app.numCombatants, app.myCharNames);
        },
        claimCharacter: function(array, evt) {
            app.myCharNames.push(array.character);
            evt.currentTarget.innerHTML = "ME " + '<i class="bi bi-caret-right"></i>';
            evt.currentTarget.classList.remove('btn-warning');
            evt.currentTarget.classList.add('btn-info');
        },
        start() {
            this.timer = setInterval(() => {
                this.elapsedTime += 1000;
            }, 1000);
        },
        stop() {
            clearInterval(this.timer);
        },
        reset() {
            this.elapsedTime = 0;
        },
        timerInitialize() {
            app.timerVisible = true;
            app.stop();
            app.reset();
            app.start();
        },
        broadcastChanges () {
            socket.emit('items-changed', app.items);
        },
        // Room generation
        generateCode: function () {
            const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

            let code = '';

            code = code + alphabet[Math.floor(Math.random() * alphabet.length)];
            code = code + alphabet[Math.floor(Math.random() * alphabet.length)];
            code = code + alphabet[Math.floor(Math.random() * alphabet.length)];
            code = code + alphabet[Math.floor(Math.random() * alphabet.length)];

            this.roomCode = code;
            this.codeGenerated = true;
            socket.emit('join', this.roomCode);
        },
        joinRoom: function () {
            socket.emit('look-for-room', this.roomCode);
        }
    }
});

function modalShow(myArray, arrayLength, names) {
    var skip = false;
    var onDeckSet = false;
    var currentTurnSet = false;

    for (let a = 0; a < arrayLength; a++) {
        for (let b = 0; b < names.length; b++) {
            if (!currentTurnSet && myArray[a].currentTurn && myArray[a].character == names[b]) {
                app.myTurnModal = true;

                currentTurnSet = true;
            }
            else if (!currentTurnSet && !onDeckSet && myArray[a].nextTurn && myArray[a].character == names[b]) {
                app.onDeckModal = true;

                onDeckSet = true;
            }
            if (!onDeckSet) {
                app.onDeckModal = false;
            }
            if (!currentTurnSet) {
                app.myTurnModal = false;
            }
        }
    }
}

function endCombat () {
    app.combatActive = false;

    socket.emit('stop-timer');

    app.stop();
    app.reset();

    for (let x = 0; x < app.numCombatants; x++) {
        app.items[x].currentTurn = false;
        app.items[x].nextTurn = false;
    }
}