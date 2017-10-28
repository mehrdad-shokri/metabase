import React, { Component } from "react";
import Button from "metabase/components/Button";
import SchedulePicker from "metabase/components/SchedulePicker";
import { connect } from "react-redux";
import { createAlert, deleteAlert, updateAlert } from "metabase/alert/alert";
import ModalContent from "metabase/components/ModalContent";
import { getUser, getUserIsAdmin } from "metabase/selectors/user";
import { getQuestion } from "metabase/query_builder/selectors";
import _ from "underscore";
import PulseEditChannels from "metabase/pulse/components/PulseEditChannels";
import { fetchPulseFormInput, fetchUsers } from "metabase/pulse/actions";
import { formInputSelector, userListSelector } from "metabase/pulse/selectors";
import DeleteModalWithConfirm from "metabase/components/DeleteModalWithConfirm";
import ModalWithTrigger from "metabase/components/ModalWithTrigger";
import { inflect } from "metabase/lib/formatting";

const getScheduleFromChannel = (channel) =>
    _.pick(channel, "schedule_day", "schedule_frame", "schedule_hour", "schedule_type")

@connect((state) => ({ question: getQuestion(state), user: getUser(state) }), { createAlert })
export class CreateAlertModalContent extends Component {
    // contains the first-time educational screen
    // ModalContent, parent uses ModalWithTrigger
    props: {
        onClose: boolean
    }

    constructor(props) {
        super()

        const { question, user } = props

        const alertCondition = question.display() === "table" ? "rows" : ""

        const defaultEmailChannel = {
            enabled: true,
            channel_type: "email",
            recipients: [user],
            schedule_day: "mon",
            schedule_frame: null,
            schedule_hour: 0,
            schedule_type: "daily"
        }

        this.state = {
            hasSeenEducationalScreen: false,
            // the default configuration for a new alert
            alert: {
                name: "We should probably autogenerate the alert name",
                alert_description: "The description should be autogenerated too",
                alert_condition: alertCondition,
                // why the UI currently exposes this only for non-raw-data queries?
                alert_first_only: false,
                card: { id: question.id() },
                channels: [defaultEmailChannel]
            },
        }
    }

    onAlertChange = (alert) => this.setState({ alert })

    onCreateAlert = async () => {
        const { createAlert, onClose } = this.props
        const { alert } = this.state
        await createAlert(alert)
        // should close be triggered manually like this
        // but the creation notification would appear automatically ...?
        // OR should the modal visibility be part of QB redux state
        // (maybe check how other modals are implemented)
        onClose()
    }

    proceedFromEducationalScreen = () => {
        // TODO: how to save that educational screen has been seen? Should come from Redux state
        this.setState({ hasSeenEducationalScreen: true })
    }

    render() {
        const { onClose } = this.props
        const { alert } = this.state

        if (alert.alert_condition !== "rows") {
            return (
                <ModalContent onClose={onClose}>
                    <AlertModalTitle text="Alerts for this kind of question not supported yet" />
                </ModalContent>
            )
        }

        if (!this.state.hasSeenEducationalScreen) {
            return (
                <ModalContent onClose={onClose}>
                    <AlertEducationalScreen onProceed={this.proceedFromEducationalScreen} />
                </ModalContent>
            )
        }

        // TODO: Remove PulseEdit css hack
        return (
            <ModalContent
                onClose={onClose}
            >
                <div className="PulseEdit ml-auto mr-auto mb4" style={{maxWidth: "550px"}}>
                    <AlertModalTitle text="Let's set up your alert" />
                    <AlertEditForm
                        alert={alert}
                        onAlertChange={this.onAlertChange}
                        onDone={this.onCreateAlert}
                    />
                    <Button onClick={onClose}>Cancel</Button>
                    <Button primary onClick={this.onCreateAlert}>Done</Button>
                </div>
            </ModalContent>
        )
    }
}

export class AlertEducationalScreen extends Component {
    props: {
        onProceed: () => void
    }

    render() {
        const { onProceed } = this.props;

        return (
            <div className="pt2 ml-auto mr-auto text-centered">
                <div className="pt4">
                    <h1>The wide world of alerts</h1>
                    <h2>There are a few different kinds of alerts you can get</h2>
                </div>
                <p>[ the educational image comes here ]</p>
                <Button primary onClick={onProceed}>Set up an alert</Button>
            </div>
        )
    }
}

@connect((state) => ({ isAdmin: getUserIsAdmin(state) }), { updateAlert, deleteAlert })
export class UpdateAlertModalContent extends Component {
    props: {
        alert: any,
        onClose: boolean,
        updateAlert: (any) => void,
        deleteAlert: (any) => void,
        isAdmin: boolean
    }

    constructor(props) {
        super()
        this.state = {
            modifiedAlert: props.alert
        }
    }

    onAlertChange = (modifiedAlert) => this.setState({ modifiedAlert })

    onUpdateAlert = async () => {
        const { updateAlert, onClose } = this.props
        const { modifiedAlert } = this.state
        await updateAlert(modifiedAlert)
        // should close be triggered manually like this
        // but the creation notification would appear automatically ...?
        // OR should the modal visibility be part of QB redux state
        // (maybe check how other modals are implemented)
        onClose()
    }

    onDeleteAlert = async () => {
        const { alert, deleteAlert, onClose } = this.props
        await deleteAlert(alert.id)
        onClose()
    }

    render() {
        const { onClose, alert, isAdmin } = this.props
        const { modifiedAlert } = this.state

        // TODO: Remove PulseEdit css hack
        return (
            <ModalContent
                onClose={onClose}
            >
                <div className="PulseEdit ml-auto mr-auto mb4" style={{maxWidth: "550px"}}>
                    <AlertModalTitle text="Edit your alert" />
                    <AlertEditForm
                        alert={modifiedAlert}
                        onAlertChange={this.onAlertChange}
                        onDone={this.onUpdateAlert}
                    />
                    { isAdmin && <DeleteAlertSection alert={alert} onDeleteAlert={this.onDeleteAlert} /> }
                    <Button onClick={onClose}>Cancel</Button>
                    <Button primary onClick={this.onUpdateAlert}>Done</Button>
                </div>
            </ModalContent>
        )
    }
}

export class DeleteAlertSection extends Component {
    deleteModal: any

    getConfirmItems() {
        // same as in PulseEdit but with some changes to copy
        return this.props.alert.channels.map(c =>
            c.channel_type === "email" ?
                <span>This alert will no longer be emailed to <strong>{c.recipients.length} {inflect("address", c.recipients.length)}</strong>.</span>
                : c.channel_type === "slack" ?
                <span>Slack channel <strong>{c.details && c.details.channel}</strong> will no longer get this alert.</span>
                :
                <span>Channel <strong>{c.channel_type}</strong> will no longer receive this alert.</span>
        );
    }

    render() {
        const { onDeleteAlert } = this.props

        return (
            <div className="DangerZone mb2 p3 rounded bordered relative">
                <h3 className="text-error absolute top bg-white px1" style={{ marginTop: "-12px" }}>Danger Zone</h3>
                <div className="ml1">
                    <h4 className="text-bold mb1">Delete this alert</h4>
                    <div className="flex">
                        <p className="h4 pr2">Stop delivery and delete this alert. There's no undo, so be careful.</p>
                        <ModalWithTrigger
                            ref={(ref) => this.deleteModal = ref}
                            triggerClasses="Button Button--danger flex-align-right flex-no-shrink"
                            triggerElement="Delete this Alert"
                        >
                            <DeleteModalWithConfirm
                                objectType="alert"
                                title="Delete this alert?"
                                confirmItems={this.getConfirmItems()}
                                onClose={() => this.deleteModal.close()}
                                onDelete={onDeleteAlert}
                            />
                        </ModalWithTrigger>
                    </div>
                </div>
            </div>
        )
    }
}

const AlertModalTitle = ({ text }) =>
    <div className="ml-auto mr-auto mt2 mb4 text-centered">
        <p>[edit alert icon comes here]</p>
        <h2>{ text }</h2>
    </div>

@connect((state) => ({ isAdmin: getUserIsAdmin(state) }), null)
export class AlertEditForm extends Component {
    props: {
        alert: any,
        onAlertChange: (any) => void,
        isAdmin: boolean
    }

    onScheduleChange = (schedule) => {
        const { alert, onAlertChange } = this.props;

        // update the same schedule to all channels at once
        onAlertChange({
            ...alert,
            channels: alert.channels.map((channel) => ({ ...channel, ...schedule }))
        })
    }

    render() {
        const { alert, isAdmin, onAlertChange } = this.props

        // the schedule should be same for all channels so we can use the first one
        const schedule = getScheduleFromChannel(alert.channels[0])

        return (
            <div>
                <AlertEditSchedule
                    schedule={schedule}
                    onScheduleChange={this.onScheduleChange}
                />
                { isAdmin &&
                    <AlertEditChannels
                        alert={alert}
                        onAlertChange={onAlertChange}
                    />
                }
            </div>
        )
    }
}

export class AlertEditSchedule extends Component {
    render() {
        const { schedule } = this.props;

        return (
            <div>
                <h3>How often should we check for results?</h3>

                <div className="bordered rounded mb2">
                    <RawDataAlertTip />
                    <div className="p3 bg-grey-0">
                        <SchedulePicker
                            schedule={schedule}
                            scheduleOptions={["hourly", "daily", "weekly"]}
                            onScheduleChange={this.props.onScheduleChange}
                            textBeforeInterval="Check"
                        />
                    </div>
                </div>
            </div>
        )
    }
}

@connect(
    (state) => ({ user: getUser(state), userList: userListSelector(state), formInput: formInputSelector(state) }),
    { fetchPulseFormInput, fetchUsers }
)
export class AlertEditChannels extends Component {
    props: {
        onChannelsChange: (any) => void,
        user: any,
        userList: any[],
        // this stupidly named property contains different channel options, nothing else
        formInput: any,
        fetchPulseFormInput: () => void,
        fetchUsers: () => void
    }

    componentDidMount() {
        this.props.fetchPulseFormInput();
        this.props.fetchUsers();
    }

    // Technically pulse definition is equal to alert definition
    onSetPulse = (alert) => {
        // If the pulse channel has been added, it PulseEditChannels puts the default schedule to it
        // We want to have same schedule for all channels
        const schedule = getScheduleFromChannel(alert.channels.find((c) => c.channel_type === "email"))

        this.props.onAlertChange({
            ...alert,
            channels: alert.channels.map((channel) => ({ ...channel, ...schedule }))
        })
    }

    render() {
        const { alert, user, userList, formInput } = this.props;
        return (
            <div>
                <h3>Where do you want to send these alerts?</h3>
                <div className="mb2">
                    <PulseEditChannels
                        pulse={alert}
                        pulseId={alert.id}
                        pulseIsValid={true}
                        formInput={formInput}
                        user={user}
                        userList={userList}
                        setPulse={this.onSetPulse}
                        hideSchedulePicker={true}
                        emailRecipientText={"Email alerts to:"}
                     />
                </div>
            </div>
        )
    }
}

const RawDataAlertTip = () =>
    <div className="border-row-divider p3">
        <b>Tip:</b> This kind of alert is most useful when your saved question doesn’t <em>usually</em> return any results, but you want to know when it does.
    </div>
