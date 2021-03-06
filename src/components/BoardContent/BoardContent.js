import React, { useEffect, useRef, useState } from "react";
import { Container, Draggable } from "react-smooth-dnd";
import {
  Container as BootstrapContainer,
  Row,
  Col,
  Form,
  Button,
} from "react-bootstrap";
import Column from "components/Column/Column";
import { isEmpty, cloneDeep } from "lodash";
import { mapOrder } from "utilities/sorts";
import { applyDrag } from "utilities/dragDrop";
import {
  fetchBoardDetails,
  createNewColumn,
  updateBoard,
  updateColumn,
  updateCard,
} from "actions/ApiCall";

import "./BoardContent.scss";

const BoardContent = () => {
  const [board, setBoard] = useState({});
  const [columns, setColumns] = useState([]);
  const [openNewColumnForm, setOpenNewColumnForm] = useState(false);

  // handle open add new column (true -> show edit input)
  const toggleOpenNewColumnForm = () =>
    setOpenNewColumnForm(!openNewColumnForm);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const onNewColumnTitleChange = (e) => setNewColumnTitle(e.target.value);

  const newColumnInputRef = useRef(null);

  // get data in initialData
  useEffect(() => {
    const boardId = "62d4b8505a37af07f08a18c8";
    fetchBoardDetails(boardId).then((board) => {
      setBoard(board);
      setColumns(mapOrder(board.columns, board.columnOrder, "_id"));
    });
  }, []);

  // handle ref in input (focus, select)
  useEffect(() => {
    if (newColumnInputRef && newColumnInputRef.current) {
      newColumnInputRef.current.focus();
      newColumnInputRef.current.select();
    }
  }, [openNewColumnForm]);

  if (isEmpty(board)) {
    return <div className="not-found">Board not found</div>;
  }

  // handle drop/drag column by react-smooth-dnd
  const onColumnDrop = (dropResult) => {
    // clone deep without affecting the original column
    let newColumns = cloneDeep(columns);
    newColumns = applyDrag(newColumns, dropResult);

    let newBoard = cloneDeep(board);
    newBoard.columnOrder = newColumns.map((c) => c._id);
    newBoard.columns = newColumns;

    setColumns(newColumns);
    setBoard(newBoard);

    // Call API update column Order in board details
    // There was an error returning the old state
    updateBoard(newBoard._id, newBoard).catch(() => {
      setColumns(columns);
      setBoard(board);
    });
  };

  // component children (Column) -> component parent (BoardContent)
  const onCardDrop = (columnId, dropResult) => {
    if (dropResult.removedIndex !== null || dropResult.addedIndex !== null) {
      let newColumns = cloneDeep(columns);

      let currentColumn = newColumns.find((c) => c._id === columnId);
      currentColumn.cards = applyDrag(currentColumn.cards, dropResult);
      currentColumn.cardOrder = currentColumn.cards.map((i) => i._id);

      setColumns(newColumns);

      if (dropResult.removedIndex !== null && dropResult.addedIndex !== null) {
        /**
         * Action: Move card inside its column
         * 1 - Call API update cardOrder in current column
         */
        updateColumn(currentColumn._id, currentColumn).catch(() =>
          setColumns(columns)
        );
      } else {
        /**
         * Action: Move card between two column
         */
        // 1 - Call API update cardOrder in current column
        updateColumn(currentColumn._id, currentColumn).catch(() =>
          setColumns(columns)
        );

        if (dropResult.addedIndex !== null) {
          let currentCard = cloneDeep(dropResult.payload);
          currentCard.columnId = currentColumn._id;

          // 2 - Call API update columnId in current card
          updateCard(currentCard._id, currentCard);
        }
      }
    }
  };

  // handle add new column
  const addNewColumn = () => {
    if (!newColumnTitle) {
      newColumnInputRef.current.focus();
      return;
    }

    const newColumnToAdd = {
      boardId: board._id,
      title: newColumnTitle.trim(),
    };

    // Call API
    createNewColumn(newColumnToAdd).then((column) => {
      let newColumns = [...columns];
      newColumns.push(column);

      let newBoard = { ...board };
      newBoard.columnOrder = newColumns.map((c) => c._id);
      newBoard.columns = newColumns;

      setColumns(newColumns);
      setBoard(newBoard);
      setNewColumnTitle("");
      toggleOpenNewColumnForm("");
    });
  };

  const onUpdateColumnState = (newColumnToUpdate) => {
    const columnIdToUpdate = newColumnToUpdate._id;

    let newColumns = [...columns];
    const columnIndexToUpdate = newColumns.findIndex(
      (i) => i._id === columnIdToUpdate
    );

    if (newColumnToUpdate._destroy) {
      // remove column
      // delete 1 item to index(columnIndexUpdate) in new Column
      newColumns.splice(columnIndexToUpdate, 1);
    } else {
      // update column info
      newColumns.splice(columnIndexToUpdate, 1, newColumnToUpdate);
    }

    let newBoard = { ...board };
    newBoard.columnOrder = newColumns.map((c) => c._id);
    newBoard.columns = newColumns;

    setColumns(newColumns);
    setBoard(newBoard);
  };

  return (
    <div className="board-content">
      <Container
        orientation="horizontal"
        onDrop={onColumnDrop}
        getChildPayload={(index) => columns[index]}
        dragHandleSelector=".column-drag-handle"
        dropPlaceholder={{
          animationDuration: 150,
          showOnTop: true,
          className: "column-drop-preview",
        }}
      >
        {columns.map((column, index) => (
          <Draggable key={index}>
            <Column
              column={column}
              onCardDrop={onCardDrop}
              onUpdateColumnState={onUpdateColumnState}
            />
          </Draggable>
        ))}
      </Container>

      <BootstrapContainer className="trello-bootstrap-container">
        {!openNewColumnForm ? (
          <Row>
            <Col className="add-new-column" onClick={toggleOpenNewColumnForm}>
              <i className="fa fa-plus icon" /> Add another column
            </Col>
          </Row>
        ) : (
          <Row>
            <Col className="enter-new-column">
              <Form.Control
                size="sm"
                type="text"
                placeholder="Enter column title..."
                className="input-enter-new-column"
                ref={newColumnInputRef}
                value={newColumnTitle}
                onChange={onNewColumnTitleChange}
                onKeyDown={(event) => event.key === "Enter" && addNewColumn()}
              />
              <Button variant="success" size="sm" onClick={addNewColumn}>
                Add column
              </Button>
              <span className="cancel-icon" onClick={toggleOpenNewColumnForm}>
                <i className="fa fa-trash icon" />
              </span>
            </Col>
          </Row>
        )}
      </BootstrapContainer>
    </div>
  );
};

export default BoardContent;
