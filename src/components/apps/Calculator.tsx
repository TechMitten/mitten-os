'use client';

import React, { useState, useCallback, useEffect } from 'react';

export function Calculator() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const formatDisplay = (value: string): string => {
    if (value === 'Error') return 'Error';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    // If there's a trailing decimal or decimal digits, preserve them
    if (value.includes('.')) {
      const [intPart, decPart] = value.split('.');
      const formattedInt = parseInt(intPart).toLocaleString('en-US');
      return `${formattedInt}.${decPart}`;
    }
    return num.toLocaleString('en-US', { maximumFractionDigits: 10 });
  };

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(prev => prev === '0' ? digit : prev + digit);
    }
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(prev => prev + '.');
    }
  }, [waitingForOperand, display]);

  const clear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
    setWaitingForOperand(false);
  }, []);

  const backspace = useCallback(() => {
    if (waitingForOperand) return;
    setDisplay(prev => {
      if (prev.length === 1 || (prev.length === 2 && prev.startsWith('-'))) return '0';
      return prev.slice(0, -1);
    });
  }, [waitingForOperand]);

  const negate = useCallback(() => {
    if (display === '0' || display === 'Error') return;
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev);
  }, [display]);

  const percent = useCallback(() => {
    if (display === 'Error') return;
    const current = parseFloat(display);
    if (isNaN(current)) return;
    if (prevValue !== null && operator) {
      // If there's an ongoing operation, % calculates percentage of prevValue
      const result = (prevValue * current) / 100;
      setDisplay(String(result));
    } else {
      const result = current / 100;
      setDisplay(String(result));
    }
    setWaitingForOperand(true);
  }, [display, prevValue, operator]);

  const performOperation = useCallback((nextOperator: string) => {
    const currentValue = parseFloat(display);
    if (isNaN(currentValue)) return;

    const operatorSymbol = (op: string): string => {
      switch (op) {
        case '+': return '+';
        case '-': return '−';
        case '*': return '×';
        case '/': return '÷';
        default: return op;
      }
    };

    if (prevValue !== null && operator && !waitingForOperand) {
      let result: number;
      switch (operator) {
        case '+': result = prevValue + currentValue; break;
        case '-': result = prevValue - currentValue; break;
        case '*': result = prevValue * currentValue; break;
        case '/':
          if (currentValue === 0) {
            setDisplay('Error');
            setExpression('');
            setPrevValue(null);
            setOperator(null);
            setWaitingForOperand(true);
            return;
          }
          result = prevValue / currentValue;
          break;
        default: result = currentValue;
      }

      // Format result nicely
      const resultStr = Number.isInteger(result) ? String(result) : String(parseFloat(result.toFixed(10)));
      setDisplay(resultStr);
      setPrevValue(result);
      setExpression(`${resultStr} ${operatorSymbol(nextOperator)}`);
    } else {
      setPrevValue(currentValue);
      setExpression(`${display} ${operatorSymbol(nextOperator)}`);
    }

    setOperator(nextOperator);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, waitingForOperand]);

  const calculate = useCallback(() => {
    if (operator === null || prevValue === null) return;
    const currentValue = parseFloat(display);
    if (isNaN(currentValue)) return;

    const operatorSymbol = (op: string): string => {
      switch (op) {
        case '+': return '+';
        case '-': return '−';
        case '*': return '×';
        case '/': return '÷';
        default: return op;
      }
    };

    const fullExpression = `${expression} ${display} =`;

    let result: number;
    switch (operator) {
      case '+': result = prevValue + currentValue; break;
      case '-': result = prevValue - currentValue; break;
      case '*': result = prevValue * currentValue; break;
      case '/':
        if (currentValue === 0) {
          setDisplay('Error');
          setExpression('');
          setPrevValue(null);
          setOperator(null);
          setWaitingForOperand(true);
          return;
        }
        result = prevValue / currentValue;
        break;
      default: result = currentValue;
    }

    const resultStr = Number.isInteger(result) ? String(result) : String(parseFloat(result.toFixed(10)));
    setDisplay(resultStr);
    setExpression(fullExpression);
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [display, prevValue, operator, expression]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for keys we handle
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+') {
        e.preventDefault();
        performOperation('+');
      } else if (e.key === '-') {
        e.preventDefault();
        performOperation('-');
      } else if (e.key === '*') {
        e.preventDefault();
        performOperation('*');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('/');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        calculate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clear();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        clearEntry();
      } else if (e.key === '%') {
        e.preventDefault();
        percent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, calculate, backspace, clear, clearEntry, percent]);

  return (
    <div className="flex flex-col h-full bg-card dark:bg-zinc-900 p-3 select-none">
      {/* Display */}
      <div className="bg-muted dark:bg-zinc-800/50 rounded-xl p-4 mb-3 min-h-[88px] flex flex-col justify-end">
        <div className="text-xs text-muted-foreground text-right truncate mb-1 min-h-[18px]">
          {expression}
        </div>
        <div className="text-3xl font-light text-foreground text-right truncate">
          {display === 'Error' ? 'Error' : formatDisplay(display)}
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid grid-cols-4 gap-2 flex-1">
        {/* Row 1: C, CE, %, ÷ */}
        <button
          onClick={clear}
          className="bg-secondary dark:bg-zinc-600/30 hover:bg-muted dark:hover:bg-zinc-500/30 text-muted-foreground dark:text-white/70 text-sm rounded-xl h-14 transition-colors active:scale-95"
        >
          C
        </button>
        <button
          onClick={clearEntry}
          className="bg-secondary dark:bg-zinc-600/30 hover:bg-muted dark:hover:bg-zinc-500/30 text-muted-foreground dark:text-white/70 text-sm rounded-xl h-14 transition-colors active:scale-95"
        >
          CE
        </button>
        <button
          onClick={percent}
          className="bg-secondary dark:bg-zinc-600/30 hover:bg-muted dark:hover:bg-zinc-500/30 text-muted-foreground dark:text-white/70 text-sm rounded-xl h-14 transition-colors active:scale-95"
        >
          %
        </button>
        <button
          onClick={() => performOperation('/')}
          className="bg-amber-500/15 dark:bg-amber-600/30 hover:bg-amber-500/25 dark:hover:bg-amber-600/50 text-amber-600 dark:text-amber-400 text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          ÷
        </button>

        {/* Row 2: 7, 8, 9, × */}
        <button
          onClick={() => inputDigit('7')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          7
        </button>
        <button
          onClick={() => inputDigit('8')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          8
        </button>
        <button
          onClick={() => inputDigit('9')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          9
        </button>
        <button
          onClick={() => performOperation('*')}
          className="bg-amber-500/15 dark:bg-amber-600/30 hover:bg-amber-500/25 dark:hover:bg-amber-600/50 text-amber-600 dark:text-amber-400 text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          ×
        </button>

        {/* Row 3: 4, 5, 6, - */}
        <button
          onClick={() => inputDigit('4')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          4
        </button>
        <button
          onClick={() => inputDigit('5')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          5
        </button>
        <button
          onClick={() => inputDigit('6')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          6
        </button>
        <button
          onClick={() => performOperation('-')}
          className="bg-amber-500/15 dark:bg-amber-600/30 hover:bg-amber-500/25 dark:hover:bg-amber-600/50 text-amber-600 dark:text-amber-400 text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          −
        </button>

        {/* Row 4: 1, 2, 3, + */}
        <button
          onClick={() => inputDigit('1')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          1
        </button>
        <button
          onClick={() => inputDigit('2')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          2
        </button>
        <button
          onClick={() => inputDigit('3')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          3
        </button>
        <button
          onClick={() => performOperation('+')}
          className="bg-amber-500/15 dark:bg-amber-600/30 hover:bg-amber-500/25 dark:hover:bg-amber-600/50 text-amber-600 dark:text-amber-400 text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          +
        </button>

        {/* Row 5: ±, 0, ., = */}
        <button
          onClick={negate}
          className="bg-secondary dark:bg-zinc-600/30 hover:bg-muted dark:hover:bg-zinc-500/30 text-muted-foreground dark:text-white/70 text-sm rounded-xl h-14 transition-colors active:scale-95"
        >
          ±
        </button>
        <button
          onClick={() => inputDigit('0')}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          0
        </button>
        <button
          onClick={inputDecimal}
          className="bg-muted dark:bg-zinc-700/50 hover:bg-accent dark:hover:bg-zinc-600/50 text-foreground text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          .
        </button>
        <button
          onClick={calculate}
          className="bg-amber-500 hover:bg-amber-600 text-white text-lg rounded-xl h-14 transition-colors active:scale-95"
        >
          =
        </button>

        {/* Backspace row - spanning full width at bottom if needed */}
        <button
          onClick={backspace}
          className="col-span-4 bg-secondary dark:bg-zinc-600/30 hover:bg-muted dark:hover:bg-zinc-500/30 text-muted-foreground dark:text-white/70 text-sm rounded-xl h-10 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
          Backspace
        </button>
      </div>
    </div>
  );
}
