import React, { Component } from 'react';

function initial(names) {
    const namesArray = names ? Array.isArray(names) ? names : names.split(" ")
                             : [];
    // Removes surnames and map with the first letter followed by a dot.
    return namesArray.filter(name => name.search(/^[A-Za-z\u00C0-\u017F]/) >= 0)
                     .map(name => name[0] + ".").join(" ")
}

export default class AuthorList extends Component {
    render(){
        // debugger;
        const authorList = this.props.authors.map(({lastName, firstName}, authorNum) => {
            return (
                <li className="author" key={authorNum}>
                    <span className="author-firstname">{ initial(firstName) }</span>{" "}
                    <span className="author-lastname">{ lastName }</span>
                </li>
            );
        });
        return <ul className="author-list">{authorList}</ul>;
    }
}
