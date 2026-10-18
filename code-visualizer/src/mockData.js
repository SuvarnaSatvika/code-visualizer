export const initialNodes = [
  { id: "n1", position: { x: 250, y: 50 }, data: { label: "let total = 0;" } },
  { id: "n2", position: { x: 250, y: 150 }, data: { label: "for (let i = 0; i < 3; i++)" } },
  { id: "n3", position: { x: 250, y: 250 }, data: { label: "total = total + i;" } }
];

export const initialEdges = [
  { id: "e1", source: "n1", target: "n2" },
  { id: "e2", source: "n2", target: "n3" }
];

export const trace = [
  { 
    step: 0, activeNode: "n1", 
    memorySnapshot: { total: { value: 0, mutated: true } },
    loopState: null,
    explanation: "We are initializing a variable named 'total' and setting its starting value to 0. This will act as our accumulator to hold the sum."
  },
  { 
    step: 1, activeNode: "n2", 
    memorySnapshot: { total: { value: 0, mutated: false }, i: { value: 0, mutated: true } },
    loopState: { iteration: 1, condition: "0 < 3", result: "True" },
    explanation: "The loop begins. We initialize the counter 'i' to 0 and check if 0 is less than 3. Since this is True, we will execute the code inside the loop."
  },
  { 
    step: 2, activeNode: "n3", 
    memorySnapshot: { total: { value: 0, mutated: true }, i: { value: 0, mutated: false } },
    loopState: { iteration: 1, condition: "0 < 3", result: "True" },
    explanation: "We add the current value of 'i' (which is 0) to 'total' (which is 0). The new value of 'total' is now 0."
  },
  { 
    step: 3, activeNode: "n2", 
    memorySnapshot: { total: { value: 0, mutated: false }, i: { value: 1, mutated: true } },
    loopState: { iteration: 2, condition: "1 < 3", result: "True" },
    explanation: "The first iteration is done. We increment 'i' by 1 (it is now 1). We check if 1 is less than 3. It is True, so the loop continues."
  }
];