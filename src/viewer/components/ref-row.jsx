import React, { Component } from 'react';
import AuthorList from "./author-list.jsx";
import bibtexFormat from "../../bibtex-format-str.js";
import stringSimilarity from "string-similarity";
import diacritics from "diacritics";

function getSimilarity(string1, string2){
    if(string1 == null || string2 == null){
        return string1 !== string2 ? 0 : 1;
    }
    string1 = diacritics.remove(string1).replace(/[^a-zA-Z0-9]/g, "");
    string2 = diacritics.remove(string2).replace(/[^a-zA-Z0-9]/g, "");
    return stringSimilarity.compareTwoStrings(string1, string2);
}

export default class RefRow extends Component {
    render(){
        const ref = this.props.targetRef;
        const tags = ref.bibEntry.entryTags;
        const scholarResult = ref.gsResult;
        const title = tags.title ? bibtexFormat(tags.title) : tags.title;
        const cited = scholarResult.citedBy;
        const authors = tags.author.split(" and ").map(
            (author) => author.split(", ").map((x) => bibtexFormat(x))
        ).map(
            ([lastName, firstName]) => ({ lastName, firstName })
        );
        const similarity = getSimilarity(title, scholarResult.title);
        return (
            <tr className={similarity < 0.9 ? "bib unreliable" : "bib reliable"}>
                <td className="bib-title">{title}</td>
                <td className="bib-authors"><AuthorList authors={authors} /></td>
                <td className="bib-cited">{cited}</td>
                <td className="bib-confidence">{similarity.toFixed(2)}</td>
            </tr>
        );
    }
}
