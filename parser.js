import { Pattern, Rule } from './rule.js';
import { Variable, Constant } from './statement.js';


const NEXT_RULE = 'NEXT_RULE';
const IN_BODY = 'IN_BODY';
const IN_HEAD = 'IN_HEAD';
const NEXT_HEAD = 'NEXT_HEAD';

const BODY = 'BODY';
const HEAD = 'HEAD';

export class RuleParser {

    data;
    len = 0;
    idx = 0;
    state = NEXT_RULE;

    rules = [];
    clauses = [];
    terms = [];
    head;
    body;

    logging = false;

    constructor(logging) {
        if (logging !== undefined)
            this.logging = logging;
    }

    parse(str) {
        this.data = str;
        this.len = str.length;

        var term = false;

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

                case '"':
                    term = new Constant('"' + this.untilSep('"') + '"');
                    break;

                case '<':
                    term = new Constant('<' + this.untilSep('>') + '>');
                    break;

                case '?':
                    term = new Variable(this.whileRe(/[a-zA-Z0-9_\-\.:]/));
                    break;

                case '.':
                    if (!this.newClause())
                        return false;

                    break;

                default:
                    if (/\s/.test(token))
                        continue;

                    const nr = this.whileNr();
                    if (nr == false)
                        return false;

                    term = new Constant(nr);
                    break;
            }

            if (term !== false) {
                this.log("new term:", term + "");

                if (!(this.state == IN_BODY || this.state == IN_HEAD)) {
                    console.error(`found term '${term + ""}' outside of rule`);
                    return false;
                }

                this.terms.push(term);
                term = false;
            }
        }

        if (!this.checkRule())
            return false;

        return this.rules;
    }

    unexpectedToken(token) {
        console.error(`unexpected '${token}' at char ${this.idx}`);
        return false;
    }

    newClause() {
        if (this.terms.length != 3) {
            console.error(`expecting 3 triple terms (found '${this.terms + ""}') at char ${this.idx}`);
            return false;
        }

        this.log("new clause:", this.terms + "");

        this.clauses.push(new Pattern(this.terms[0], this.terms[1], this.terms[2]));
        this.terms = [];

        return true;
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
            console.error(`empty rule ${part} at char ${this.idx}`);

            return false;
        }

        return true;
    }

    checkRule() {
        switch (this.state) {

            case NEXT_HEAD:
                console.error(`expecting rule head at char ${this.idx}`);
                return false;

            case IN_HEAD:
            case IN_BODY:
                console.error(`unfinished rule at char ${this.idx}`);
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

        console.error(`expecting ${end}, found EOF`);
        return null;
    }

    // (private)
    whileRe(re) {
        var str = "";

        for (this.idx++; this.idx < this.len; this.idx++) {
            const char = this.curChar();
            if (re.test(char))
                str += char;
            else
                return str;
        }

        console.error(`expecting ${re}, found EOF`);
        return false;
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
                return str * 1;

            } else
                return this.unexpectedToken(char);
        }
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

    // (private)
    curChar() {
        return this.data[this.idx];
    }

    // (private)
    charAt(idx) {
        return this.data[idx];
    }

    log(...args) {
        if (this.logging) {
            const str = args.join(" ");
            console.debug(str);
        }
    }
}