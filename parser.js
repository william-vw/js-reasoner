import { Pattern, Rule } from './rule';
import { Variable, Constant } from './statement/js';

class RuleParser {

    conn = "=>";

    static NEXT_RULE = 1;
    static IN_HEAD = 2;
    static NEXT_BODY = 3;
    static IN_BODY = 4;

    data;
    len = 0;
    idx = 0;
    state = NEXT_RULE;

    parse(rules) {
        this.data = rules;
        this.len = rules.length;

        var head = null;
        var body = null;

        var rules = [];
        var clauses = [];
        var terms = [];
        var term = false;

        for (; this.idx < this.len; this.idx++) {
            if (this.state == NEXT_RULE && body !== null) {
                if (head.length == 0) {
                    console.error("found empty rule head");
                    return false;
                }
                if (body.length == 0) {
                    console.error("found empty rule body");
                    return false;
                }

                rules.push(new Rule(body, head));
            }

            const char = this.curChar();
            switch (char) {

                case '{':
                    switch (this.state) {

                        case NEXT_RULE:
                            this.state = IN_HEAD;
                            break;

                        case NEXT_BODY:
                            this.state = IN_BODY;
                            break;
                    }

                    break;

                case '}':
                    switch (this.state) {

                        case IN_HEAD:
                            if (this.skipSep(this.conn)) {
                                head = clauses;
                                clauses = [];

                                this.state = NEXT_BODY;

                            } else {
                                console.error(`was expecting '${this.conn}' at char ${this.idx}`);
                                return false;
                            }
                            break;

                        case IN_BODY:
                            body = clauses;
                            clauses = [];

                            this.state = NEXT_RULE;
                            break;
                    }

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
                    if (terms.length < 3) {
                        console.error(`expecting 3 triple terms, found ${terms.length}: '${terms + ""}'`);
                        return false;
                    }

                    clauses.push(new Pattern(terms[0], terms[1], terms[2]));
                    terms = [];

                    break;

                default:
                    if (/\s/.test(char))
                        continue;

                    term = new Constant(this.whileNr());
                    break;
            }

            if (term !== false) {
                if (!(this.state == IN_HEAD || this.state == IN_BODY)) {
                    console.error(`found term '${term + ""}' outside of rule clauses`);
                    return false;
                }

                if (terms.length == 3) {
                    console.error(`expecting 3 triple terms, found 4: '${term + ""}'`);
                    return false;
                }

                terms.push(term);
                term = false;
            }
        }

        return rules;
    }

    // (private)
    curChar() {
        return this.data[this.idx];
    }

    // (private)
    charAt(idx) {
        return this.data[idx];
    }

    // (private)
    untilSep(end) {
        var str = "";

        for (; this.idx < this.len; this.idx++) {
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

        for (; this.idx < this.len; this.idx++) {
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
        str = "";

        var decimal = false;
        for (; this.idx < this.len; this.idx++) {
            const char = this.curChar();

            if (/[0-9]/.test(char))
                str += char;

            else if (char == ".") {
                if (decimal) {
                    console.error("expecting [0-9] or \s, found '.'");
                    return false;
                }
                decimal = true;
                str += char;

            } else if (char == ' ') {
                return str * 1;
            
            } else {
                console.error(`expecting [0-9], '.' or \s, found ${char}`)
                return false;
            }
        }
    }

    // (private)
    skipWs() {
        for (; this.idx < this.len; this.idx++) {
            const char = this.curChar();
            if (/\s/s.test(char))
                continue;
        }
    }

    // (private)
    skipSep(str) {
        this.skipWs();

        for (var i = 0; i < str.length; i++) {
            const char1 = str[i];
            const char2 = this.charAt(this.idx + i);
            if (char1 != char2)
                return false;
        }
        this.idx += str.length;

        this.skipWs();

        return true;
    }
}