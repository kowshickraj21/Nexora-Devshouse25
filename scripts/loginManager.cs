using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;
using TMPro;
using UnityEngine.Networking;
using System.Collections;

public class LoginManager : MonoBehaviour
{
    public TMP_InputField emailInput;
    public TMP_InputField passwordInput;
    public Button loginButton;
    public Button signupButton;
    public TextMeshProUGUI messageText; 

    private string loginURL = "http://localhost:3000/login"; 
    void Start()
    {
        loginButton.onClick.AddListener(OnLoginButtonClicked);
        signupButton.onClick.AddListener(OnSignupButtonClicked);
    }

    void OnLoginButtonClicked()
    {
        string email = emailInput.text;
        string password = passwordInput.text;
        StartCoroutine(Login(email, password));
    }

    void OnSignupButtonClicked()
    {
        SceneManager.LoadScene("SignupScene");
    }

    IEnumerator Login(string email, string password)
    {
        string jsonData = JsonUtility.ToJson(new UserData { email = email, password = password });

        UnityWebRequest request = new UnityWebRequest(loginURL, "POST");
        byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonData);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");

        yield return request.SendWebRequest();

        if (request.result != UnityWebRequest.Result.Success)
        {
            Debug.LogError("Login Error: " + request.error);
            if (messageText) messageText.text = "Login failed. Check your network or credentials.";
        }
        else
        {
            Debug.Log("Login Success: " + request.downloadHandler.text);
            if (messageText) messageText.text = "Login Successful!";
            SceneManager.LoadScene("SampleScene");
        }
    }

    [System.Serializable]
    public class UserData
    {
        public string email;
        public string password;
    }
}
