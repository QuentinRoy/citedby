import React, { Component } from 'react';
import RefRow from "./ref-row.jsx"

export default class RefTable extends Component {
    constructor(){
        super();
    }
    render(){
        const rows = this.props.references.sort(
            (a, b) => (b.gsResult.citedBy || 0) - (a.gsResult.citedBy || 0)
        ).map(
            (ref) =>  (<RefRow targetRef={ref} key={ref.bibEntry.citationKey} />)
        );
        return (
            <table id="ref-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Authors</th>
                        <th>Cited</th>
                        <th>Confidence Score</th>
                    </tr>
                </thead>
                <tbody>{rows}</tbody>
            </table>
        );
    }
}
