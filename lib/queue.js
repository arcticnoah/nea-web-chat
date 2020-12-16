// -= File Info =-
// ...

// -= Import decelerations =-

// -= Constant decelerations =-

// -= Variable decelerations =-

// -= Class decelerations =-

class Queue {
    constructor() {
        this.data = [];
    }
    
    add(element) {
        this.data.push(element);
    }

    remove() {
        return this.data.shift();
    }

    first() {
        return this.data[0];
    }

    last() {
        return this.data[this.data.length - 1];
    }

    size() {
        return this.data.length;
    }

    isEmpty() {
        return this.data.length === 0;
    }
}

// -= Exports =-

exports.Queue = Queue;