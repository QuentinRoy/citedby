const objEntries = obj => Object.keys(obj).map(k => [k, obj[k]]);

export const bibtexMap = {
    "á": /{\\'{?a}?}/,
    "é": /{\\'{?e}?}/,
    "í": /{\\'{?i}?}/,
    "ó": /{\\'{?o}?}/,
    "ú": /{\\'{?u}?}/,
    "Á": /{\\'{?A}?}/,
    "É": /{\\'{?E}?}/,
    "Í": /{\\'{?I}?}/,
    "Ó": /{\\'{?O}?}/,
    "Ú": /{\\'{?U}?}/,
    "à": /{\\`{?a}?}/,
    "è": /{\\`{?e}?}/,
    "ì": /{\\`{?i}?}/,
    "ò": /{\\`{?o}?}/,
    "ù": /{\\`{?u}?}/,
    "À": /{\\`{?A}?}/,
    "È": /{\\`{?E}?}/,
    "Ì": /{\\`{?I}?}/,
    "Ò": /{\\`{?O}?}/,
    "Ù": /{\\`{?U}?}/,
    "ä": /{\\"{?a}?}/,
    "ë": /{\\"{?e}?}/,
    "ï": /{\\"{?i}?}/,
    "ö": /{\\"{?o}?}/,
    "ü": /{\\"{?u}?}/,
    "ÿ": /{\\"{?y}?}/,
    "Ä": /{\\"{?a}?}/,
    "Ë": /{\\"{?e}?}/,
    "Ï": /{\\"{?i}?}/,
    "Ö": /{\\"{?o}?}/,
    "Ü": /{\\"{?u}?}/,
    "Ÿ": /{\\"{?y}?}/,
    "â": /{\\^{?a}?}/,
    "ê": /{\\^{?e}?}/,
    "î": /{\\^{?i}?}/,
    "ô": /{\\^{?o}?}/,
    "û": /{\\^{?u}?}/,
    "Â": /{\\^{?A}?}/,
    "Ê": /{\\^{?E}?}/,
    "Î": /{\\^{?I}?}/,
    "Ô": /{\\^{?O}?}/,
    "Û": /{\\^{?U}?}/,
    "ø": /{\\o}/,
    "Ø": /{\\O}/,
    "ñ": /{\\~{?n}?}/,
    "Ñ": /{\\~{?N}?}/,
    "ç": /{\\c ?{?c}?}/,
    "Ç": /{\\c ?{?C}?}/,
    "å": /{\\a{?a?}}/,
    "Å": /{\\a{?A?}}/,
    "_": /{\\_}/,
    "&": /{\\&}/
};

function bibtexReplace(str){
    for(const [replacement, search] of objEntries(bibtexMap)){
        str = str.replace(new RegExp(search.source, "g"), replacement);
    }
    return str;
}

const removeBraces = str => str.replace(/{|}/g, "");

export default function bitexFormatStr(str){
    if(!str.search) debugger;
    // If there is no braces just return the string.
    if(str.search(/{.+}/) < 0){
        return str;
    }
    return removeBraces(bibtexReplace(str)).trim();
}
