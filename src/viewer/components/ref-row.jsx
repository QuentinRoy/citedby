import React from 'react';
import AuthorList from "./author-list.jsx";
import bibtexFormat from "../../bibtex-format-str.js";

export default class RefRow extends React.Component {
    render(){
        const ref = this.props.targetRef;
        const tags = ref.bibEntry.entryTags;
        const scholarResult = ref.gsResult;
        const title = tags.title ? bibtexFormat(tags.title) : tags.title;
        const citedBy = scholarResult.citedBy;
        return (
            <tr>
                <td>{title}</td>
                <td><AuthorList targetRef={ref} /></td>
                <td>{citedBy}</td>
            </tr>
        );
    }
}
