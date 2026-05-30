/**
 * Operational Transformation Engine
 *
 * Handles concurrent text editing by transforming operations
 * against each other so all clients converge to the same state.
 *
 * Operations:
 *   - { type: 'insert', position: Number, text: String }
 *   - { type: 'delete', position: Number, length: Number }
 */
class OTEngine {
  /**
   * Transform operation B against operation A.
   * Returns the transformed version of B, assuming A has already been applied.
   *
   * @param {Object} opA - The operation that was applied first
   * @param {Object} opB - The operation to transform
   * @returns {Object} Transformed version of opB
   */
  transform(opA, opB) {
    // --- Insert vs Insert ---
    if (opA.type === 'insert' && opB.type === 'insert') {
      if (opA.position < opB.position) {
        // A inserts before B → shift B right by A's text length
        return { ...opB, position: opB.position + opA.text.length };
      } else if (opA.position > opB.position) {
        // A inserts after B → no change needed
        return { ...opB };
      } else {
        // Same position → break tie by text comparison (deterministic)
        if (opA.text <= opB.text) {
          return { ...opB, position: opB.position + opA.text.length };
        }
        return { ...opB };
      }
    }

    // --- Delete vs Delete ---
    if (opA.type === 'delete' && opB.type === 'delete') {
      if (opA.position >= opB.position + opB.length) {
        // A deletes after B → no change
        return { ...opB };
      } else if (opA.position + opA.length <= opB.position) {
        // A deletes before B → shift B left
        return { ...opB, position: opB.position - opA.length };
      } else {
        // Overlapping deletes — complex case
        const overlapStart = Math.max(opA.position, opB.position);
        const overlapEnd = Math.min(
          opA.position + opA.length,
          opB.position + opB.length
        );
        const overlapLength = Math.max(0, overlapEnd - overlapStart);

        const newPosition = Math.min(opA.position, opB.position);
        const newLength = opB.length - overlapLength;

        if (newLength <= 0) {
          // B's delete is fully contained in A's delete → no-op
          return { type: 'noop' };
        }

        return { ...opB, position: newPosition, length: newLength };
      }
    }

    // --- Insert vs Delete ---
    if (opA.type === 'insert' && opB.type === 'delete') {
      if (opA.position <= opB.position) {
        // A inserts before B's delete range → shift B right
        return { ...opB, position: opB.position + opA.text.length };
      } else if (opA.position >= opB.position + opB.length) {
        // A inserts after B's delete range → no change
        return { ...opB };
      } else {
        // A inserts inside B's delete range → split B's delete
        // Delete before insert, then delete after insert
        return {
          ...opB,
          length: opB.length + opA.text.length,
        };
      }
    }

    // --- Delete vs Insert ---
    if (opA.type === 'delete' && opB.type === 'insert') {
      if (opA.position >= opB.position) {
        // A deletes after B's insert → no change
        return { ...opB };
      } else if (opA.position + opA.length <= opB.position) {
        // A deletes before B's insert → shift B left
        return { ...opB, position: opB.position - opA.length };
      } else {
        // A deletes around B's insert position
        return { ...opB, position: opA.position };
      }
    }

    // Default — return unchanged
    return { ...opB };
  }

  /**
   * Apply an operation to a code string.
   *
   * @param {string} code - Current code state
   * @param {Object} operation - Operation to apply
   * @returns {string} New code state after applying the operation
   */
  apply(code, operation) {
    if (operation.type === 'noop') {
      return code;
    }

    if (operation.type === 'insert') {
      const pos = Math.min(operation.position, code.length);
      return code.slice(0, pos) + operation.text + code.slice(pos);
    }

    if (operation.type === 'delete') {
      const pos = Math.min(operation.position, code.length);
      const end = Math.min(pos + operation.length, code.length);
      return code.slice(0, pos) + code.slice(end);
    }

    return code;
  }

  /**
   * Transform an operation against a list of concurrent operations.
   *
   * @param {Object} op - Operation to transform
   * @param {Array} concurrentOps - List of operations already applied
   * @returns {Object} Transformed operation
   */
  transformAgainstAll(op, concurrentOps) {
    let transformed = { ...op };

    for (const concurrentOp of concurrentOps) {
      transformed = this.transform(concurrentOp, transformed);
      if (transformed.type === 'noop') break;
    }

    return transformed;
  }
}

export default new OTEngine();
