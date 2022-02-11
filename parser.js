import { Pattern, Rule } from './rule.js';
import { Statement, Variable, Constant } from './statement.js';

export class Parser {

    data;
    len = 0;
    idx = 0;

    clauses = [];
    terms = [];
    term = false;

    listener;
    logging = false;

    constructor(listener, logging) {
        this.listener = listener;
        this.logging = logging;
    }

    // (private)
    parseClause(token) {
        var val = false;
        switch (token) {
            case '"':
                val = this.untilSep('"');
                break;

            case '<':
                val = this.untilSep('>');
                break;

            case '?':
                val = this.whileRe(/[a-zA-Z0-9_\-\.:]/);
                if (val == '') {
                    this.onError(`expecting variable name at char ${this.idx}`);
                    return false;
                }

                break;

            case '.':
                return this.newClause();

            default:
                if (/\s/.test(token))
                    return true;

                val = this.whileNr();
                break;
        }

        if (val == false)
            return false;

        switch (token) {

            case '"':
                this.term = new Constant('"' + val + '"');
                break;

            case '<':
                this.term = new Constant('<' + val + '>');
                break;

            case '?':
                this.term = new Variable(val);
                break;

            default:
                this.term = new Constant(val);
                break;
        }

        return true;
    }

    // (private)
    unexpectedToken(token) {
        this.onError(`unexpected '${token}' at char ${this.idx}`);
        return false;
    }

    // (private)
    newTerm() {
        this.terms.push(this.term);
        this.term = false;
    }

    // (private)
    newClause() {
        if (this.terms.length != 3) {
            this.onError(`expecting 3 triple terms (found '${this.terms + ""}') at char ${this.idx}`);
            return false;
        }

        this.log("new clause:", this.terms + "");

        this.clauses.push(this.createClause(this.terms[0], this.terms[1], this.terms[2]));
        this.terms = [];

        return true;
    }

    // (overridden by subclasses)
    createClause(s, p, o) {
        this.onError("must implement the Parser class");
    }

    // (private)
    untilSep(end) {
        var str = "";

        for (this.idx++; this.idx < this.len; this.idx++) {
            const char = this.curChar();
            if (char != end)
                str += char;
            else {
                this.idx++;
                return str;
            }
        }

        if (str.length == 0) {
            this.onError(`expecting ${end}, found EOF`);
            return false;
        }

        return str;
    }

    // (private)
    whileRe(re) {
        var str = "";

        for (this.idx++; this.idx < this.len; this.idx++) {
            const char = this.curChar();
            if (re.test(char))
                str += char;
            else {
                this.idx--;
                return str;
            }
        }

        if (str.length == 0) {
            this.onError(`expecting ${re}, found EOF`);
            return false;
        }

        return str;
    }

    whileNr() {
        var str = "";

        var decimal = false;
        for (; this.idx < this.len; this.idx++) {
            const char = this.curChar();

            if (/[0-9]/.test(char))
                str += char;

            else if (char == ".") {
                if (decimal)
                    return this.unexpectedToken(char);
                decimal = true;
                str += char;

            } else if (char == ' ') {
                this.idx--;
                return str * 1;

            } else
                return this.unexpectedToken(char);
        }
    }

    // (can be overridden by subclasses)
    token() {
        return this.charAt(this.idx);
    }

    // (private)
    curChar() {
        return this.data[this.idx];
    }

    // (private)
    charAt(idx) {
        return this.data[idx];
    }

    log(...args) {
        if (this.logging)
            console.debug(args.join(" "));
    }

    onError(msg) {
        if (this.listener)
            this.listener.error(msg);
        else
            console.error(msg);
    }
}

const NEXT_RULE = 'NEXT_RULE';
const IN_BODY = 'IN_BODY';
const IN_HEAD = 'IN_HEAD';
const NEXT_HEAD = 'NEXT_HEAD';

const BODY = 'BODY';
const HEAD = 'HEAD';

export class RuleParser extends Parser {

    state = NEXT_RULE;

    rules = [];
    head;
    body;

    constructor(logging, listener) {
        super(logging, listener);
    }

    parse(str) {
        this.data = str;
        this.len = str.length;

        for (; this.idx < this.len; this.idx++) {
            const token = this.token();

            this.log("token", "'" + token + "'", this.state);
            switch (token) {

                case '{':
                    switch (this.state) {

                        case NEXT_RULE:
                            this.state = IN_BODY;
                            break;

                        case NEXT_HEAD:
                            this.state = IN_HEAD;
                            break;

                        default:
                            return this.unexpectedToken(token);
                    }

                    break;

                case '}':
                    switch (this.state) {

                        case IN_BODY:
                            if (!this.newPart(BODY))
                                return false;

                            this.state = NEXT_HEAD;
                            break;

                        case IN_HEAD:
                            if (!this.newPart(HEAD))
                                return false;

                            this.newRule();

                            this.state = NEXT_RULE;
                            break;

                        default:
                            return this.unexpectedToken(token);
                    }

                    break;

                case '=>':
                    if (this.state != NEXT_HEAD)
                        return this.unexpectedToken(token);

                    break;

                default:
                    if (!this.parseClause(token))
                        return false;
                    break;
            }

            if (this.term !== false) {
                this.log("new term:", this.term + "");

                if (!(this.state == IN_BODY || this.state == IN_HEAD)) {
                    this.onError(`unexpected term '${this.term + ""}' at char ${this.idx}`);
                    return false;
                }

                this.newTerm(this.term);
            }
        }

        if (!this.checkRule())
            return false;

        return this.rules;
    }

    newPart(type) {
        if (!this.checkPart(type))
            return false;

        if (type == HEAD)
            this.head = this.clauses;
        else
            this.body = this.clauses;

        this.clauses = [];

        return true;
    }

    checkPart(type) {
        if (this.terms.length > 0) {
            if (!this.newClause())
                return false;
        }

        if (this.clauses.length == 0) {
            const part = (this.state == IN_HEAD ? "head" : "body");
            this.onError(`empty rule ${part} at char ${this.idx}`);

            return false;
        }

        return true;
    }

    checkRule() {
        switch (this.state) {

            case NEXT_HEAD:
                this.onError(`expecting rule head at char ${this.idx}`);
                return false;

            case IN_HEAD:
            case IN_BODY:
                this.onError(`unfinished rule at char ${this.idx}`);
                return false;

            default:
                return true;
        }
    }

    newRule() {
        const rule = new Rule(this.body, this.head);
        this.log("new rule:", rule + "");
        this.rules.push(rule);

        this.body = null;
        this.head = null;
    }

    createClause(s, p, o) {
        return new Pattern(s, p, o);
    }

    token() {
        const char = this.charAt(this.idx);
        if (char == '=') {
            if (this.charAt(this.idx + 1) == '>') {
                this.idx++;
                return '=>';
            }

        } else
            return char;
    }
}

export class DataParser extends Parser {

    constructor(logging, listener) {
        super(logging, listener);
    }

    parse(str) {
        this.data = str;
        this.len = str.length;

        for (; this.idx < this.len; this.idx++) {
            const token = this.token();

            this.log("token", "'" + token + "'", this.state);
            if (!this.parseClause(token))
                return false;

            if (this.term !== false) {
                this.log("new term:", this.term + "");
                this.newTerm();
            }
        }

        return this.clauses;
    }

    createClause(s, p, o) {
        return new Statement(s, p, o);
    }
}